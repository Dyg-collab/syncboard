import { create } from 'zustand';
import { socket } from './socket.js';

export const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

// Small helper: pick a position value that sits after the last card in a column
function nextPosition(cards, columnId) {
  const inColumn = Object.values(cards).filter((c) => c.column_id === columnId);
  if (inColumn.length === 0) return 1;
  return Math.max(...inColumn.map((c) => c.position)) + 1;
}

export const useBoardStore = create((set, get) => ({
  cards: {}, // id -> card
  lastSeq: 0,
  status: 'connecting', // connecting | synced | reconnecting
  presence: [],
  recentlyUpdated: {}, // id -> timestamp, drives the sync-pulse animation on remote changes

  // ---- applying server truth ----
  applyFullSync(cards, maxSeq) {
    const map = {};
    for (const c of cards) map[c.id] = c;
    set({ cards: map, lastSeq: maxSeq, status: 'synced' });
  },

  applyEvent(event, { remote = true } = {}) {
    const { seq, type, payload } = event;
    set((state) => {
      if (seq <= state.lastSeq) return {}; // already applied, ignore duplicate
      const cards = { ...state.cards };
      const recentlyUpdated = { ...state.recentlyUpdated };

      if (type === 'card:create' || type === 'card:move' || type === 'card:edit') {
        cards[payload.card.id] = payload.card;
        if (remote) recentlyUpdated[payload.card.id] = Date.now();
      } else if (type === 'card:delete') {
        delete cards[payload.id];
      }

      return { cards, lastSeq: seq, recentlyUpdated, status: 'synced' };
    });
  },

  applyIncremental(events, maxSeq) {
    for (const e of events) get().applyEvent(e, { remote: true });
    set({ lastSeq: maxSeq, status: 'synced' });
  },

  setStatus(status) {
    set({ status });
  },

  setPresence(list) {
    set({ presence: list });
  },

  clearRecentlyUpdated(id) {
    set((state) => {
      const recentlyUpdated = { ...state.recentlyUpdated };
      delete recentlyUpdated[id];
      return { recentlyUpdated };
    });
  },

  // ---- user-initiated mutations (optimistic) ----
  createCard(columnId, title) {
    const cards = get().cards;
    const position = nextPosition(cards, columnId);
    const tempId = `temp_${Date.now()}`;
    const optimisticCard = {
      id: tempId,
      column_id: columnId,
      title,
      description: '',
      position,
      version: 1,
      updated_at: Date.now(),
      updated_by: 'you',
      _optimistic: true,
    };
    set((state) => ({ cards: { ...state.cards, [tempId]: optimisticCard } }));

    socket.emit('card:create', { tempId, columnId, title, position }, (res) => {
      if (res?.ok) {
        set((state) => {
          const cards = { ...state.cards };
          delete cards[tempId];
          cards[res.card.id] = res.card;
          return { cards };
        });
      }
    });
  },

  moveCard(id, columnId, position) {
    const existing = get().cards[id];
    if (!existing) return;
    const expectedVersion = existing.version;

    // Apply immediately so the drag feels instant
    set((state) => ({
      cards: {
        ...state.cards,
        [id]: { ...existing, column_id: columnId, position },
      },
    }));

    socket.emit('card:move', { id, expectedVersion, columnId, position }, (res) => {
      if (res?.ok) {
        set((state) => ({ cards: { ...state.cards, [id]: res.card } }));
      } else if (res?.reason === 'conflict' && res.card) {
        // Someone else moved it first — snap back to authoritative state
        set((state) => ({ cards: { ...state.cards, [id]: res.card } }));
      }
    });
  },

  editCard(id, fields) {
    const existing = get().cards[id];
    if (!existing) return;
    const expectedVersion = existing.version;
    set((state) => ({ cards: { ...state.cards, [id]: { ...existing, ...fields } } }));

    socket.emit('card:edit', { id, expectedVersion, ...fields }, (res) => {
      if (res?.ok) {
        set((state) => ({ cards: { ...state.cards, [id]: res.card } }));
      } else if (res?.reason === 'conflict' && res.card) {
        set((state) => ({ cards: { ...state.cards, [id]: res.card } }));
      }
    });
  },

  deleteCard(id) {
    set((state) => {
      const cards = { ...state.cards };
      delete cards[id];
      return { cards };
    });
    socket.emit('card:delete', { id });
  },
}));
