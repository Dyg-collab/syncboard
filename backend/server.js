import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SyncBoard Backend is Running 🚀');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 4000;

// ---- Statements ----
const getAllCards = db.prepare('SELECT * FROM cards ORDER BY column_id, position ASC');
const getCard = db.prepare('SELECT * FROM cards WHERE id = ?');
const insertCard = db.prepare(`
  INSERT INTO cards (id, column_id, title, description, position, version, updated_at, updated_by)
  VALUES (@id, @column_id, @title, @description, @position, 1, @updated_at, @updated_by)
`);
const updateCardStmt = db.prepare(`
  UPDATE cards
  SET column_id = @column_id, title = @title, description = @description,
      position = @position, version = @version, updated_at = @updated_at, updated_by = @updated_by
  WHERE id = @id
`);
const deleteCardStmt = db.prepare('DELETE FROM cards WHERE id = ?');
const insertEvent = db.prepare('INSERT INTO events (type, payload, created_at) VALUES (?, ?, ?)');
const getEventsSince = db.prepare('SELECT * FROM events WHERE seq > ? ORDER BY seq ASC');
const getMaxSeq = db.prepare('SELECT MAX(seq) AS seq FROM events').get;

function logEvent(type, payload) {
  const info = insertEvent.run(type, JSON.stringify(payload), Date.now());
  return info.lastInsertRowid; // seq
}

function currentMaxSeq() {
  const row = db.prepare('SELECT MAX(seq) AS seq FROM events').get();
  return row.seq || 0;
}

// ---- Presence (in-memory, ephemeral, not persisted) ----
// socketId -> { userId, name, color, draggingCardId }
const presence = new Map();

function broadcastPresence() {
  io.emit('presence:update', Array.from(presence.values()));
}

const PRESENCE_COLORS = ['#E8B34C', '#5EEAD4', '#F87171', '#A78BFA', '#60A5FA', '#FB923C', '#4ADE80'];
let colorCursor = 0;
function nextColor() {
  const c = PRESENCE_COLORS[colorCursor % PRESENCE_COLORS.length];
  colorCursor += 1;
  return c;
}

io.on('connection', (socket) => {
  const { name } = socket.handshake.auth || {};
  const user = {
    socketId: socket.id,
    userId: socket.id,
    name: name && name.trim() ? name.trim() : `Guest-${socket.id.slice(0, 4)}`,
    color: nextColor(),
    draggingCardId: null,
  };
  presence.set(socket.id, user);
  broadcastPresence();

  // ---- Initial sync / resync ----
  // Client may send lastSeq if it's reconnecting and already has state.
  socket.on('sync:request', ({ lastSeq } = {}) => {
    const maxSeq = currentMaxSeq();

    if (typeof lastSeq === 'number' && lastSeq > 0 && lastSeq <= maxSeq) {
      // Incremental resync: only send what was missed
      const missed = getEventsSince.all(lastSeq).map((e) => ({
        seq: e.seq,
        type: e.type,
        payload: JSON.parse(e.payload),
      }));
      socket.emit('sync:incremental', { events: missed, maxSeq });
    } else {
      // Full snapshot (first load, or client is too far behind to catch up incrementally)
      const cards = getAllCards.all();
      socket.emit('sync:full', { cards, maxSeq });
    }
  });

  // ---- Create card ----
  socket.on('card:create', ({ tempId, columnId, title, position }, ack) => {
    const now = Date.now();
    const card = {
      id: `card_${now}_${Math.random().toString(36).slice(2, 8)}`,
      column_id: columnId,
      title: title?.trim() || 'Untitled',
      description: '',
      position,
      updated_at: now,
      updated_by: user.name,
    };
    insertCard.run(card);
    const saved = getCard.get(card.id);
    const seq = logEvent('card:create', { card: saved });
    io.emit('event', { seq, type: 'card:create', payload: { card: saved } });
    if (ack) ack({ ok: true, tempId, card: saved });
  });

  // ---- Move card (the important one: optimistic concurrency check) ----
  socket.on('card:move', ({ id, expectedVersion, columnId, position }, ack) => {
    const existing = getCard.get(id);
    if (!existing) {
      if (ack) ack({ ok: false, reason: 'not_found' });
      return;
    }

    if (existing.version !== expectedVersion) {
      // CONFLICT: someone else moved this card since the client last saw it.
      // Reject the stale write and hand back the authoritative current state
      // so the client can reconcile instead of silently clobbering it.
      if (ack) ack({ ok: false, reason: 'conflict', card: existing });
      return;
    }

    const updated = {
      ...existing,
      column_id: columnId,
      position,
      version: existing.version + 1,
      updated_at: Date.now(),
      updated_by: user.name,
    };
    updateCardStmt.run(updated);
    const seq = logEvent('card:move', { card: updated });
    io.emit('event', { seq, type: 'card:move', payload: { card: updated } });
    if (ack) ack({ ok: true, card: updated });
  });

  // ---- Edit card title/description ----
  socket.on('card:edit', ({ id, expectedVersion, title, description }, ack) => {
    const existing = getCard.get(id);
    if (!existing) {
      if (ack) ack({ ok: false, reason: 'not_found' });
      return;
    }
    if (existing.version !== expectedVersion) {
      if (ack) ack({ ok: false, reason: 'conflict', card: existing });
      return;
    }
    const updated = {
      ...existing,
      title: title !== undefined ? title : existing.title,
      description: description !== undefined ? description : existing.description,
      version: existing.version + 1,
      updated_at: Date.now(),
      updated_by: user.name,
    };
    updateCardStmt.run(updated);
    const seq = logEvent('card:edit', { card: updated });
    io.emit('event', { seq, type: 'card:edit', payload: { card: updated } });
    if (ack) ack({ ok: true, card: updated });
  });

  // ---- Delete card ----
  socket.on('card:delete', ({ id }, ack) => {
    const existing = getCard.get(id);
    if (!existing) {
      if (ack) ack({ ok: true }); // already gone, treat as success
      return;
    }
    deleteCardStmt.run(id);
    const seq = logEvent('card:delete', { id });
    io.emit('event', { seq, type: 'card:delete', payload: { id } });
    if (ack) ack({ ok: true });
  });

  // ---- Ephemeral presence: dragging indicator ----
  socket.on('presence:dragging', (cardId) => {
    const p = presence.get(socket.id);
    if (p) {
      p.draggingCardId = cardId || null;
      broadcastPresence();
    }
  });

  socket.on('disconnect', () => {
    presence.delete(socket.id);
    broadcastPresence();
  });
});

app.get('/health', (req, res) => res.json({ ok: true, maxSeq: currentMaxSeq() }));

httpServer.listen(PORT, () => {
  console.log(`SyncBoard backend listening on http://localhost:${PORT}`);
});
