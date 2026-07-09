# SyncBoard

A real-time collaborative kanban board. Multiple people can view and edit the
same board at once — drag a card in one browser tab and it moves in every
other connected tab instantly, with correct handling of concurrent edits and
dropped connections.

## Stack

- **Frontend:** React (Vite), Zustand for state, @dnd-kit for drag-and-drop, Tailwind
- **Backend:** Node.js, Express, Socket.IO, SQLite (better-sqlite3)

## Running it locally

**Backend** (in one terminal):
```
cd backend
npm install
npm start
```
Runs on `http://localhost:4000`. A `syncboard.db` SQLite file is created automatically with a few seed cards.

**Frontend** (in another terminal):
```
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

Open the app in two browser windows (one can be incognito) side by side and
drag a card in one — it moves in the other immediately.

---

## Architecture — the three things worth explaining in an interview

### 1. Optimistic UI with server-side conflict detection

When you drag a card, the UI updates **instantly**, before the server has
confirmed anything. That's necessary for the app to feel responsive, but it
creates a real problem: what if two people move the *same* card at the same
time? Naively, whichever socket event the server processes last just
silently overwrites the other — no error, no signal, one person's action
vanishes.

SyncBoard handles this with a simple **optimistic concurrency check**: every
card has a `version` integer. When a client sends a move, it includes the
version it *thinks* the card is currently at (`expectedVersion`). The server
only applies the write if that matches the current version in the database;
otherwise it rejects the write and sends back the authoritative card state,
which the client reconciles into. See `server.js` → `card:move` handler and
`store.js` → `moveCard`.

This is the same pattern (version/ETag-based optimistic locking) used in
real systems like Google Docs revision checks or REST APIs with `If-Match`
headers — a legitimate, explainable middle ground between naive
last-write-wins and full CRDT merge logic.

### 2. An event log with sequence numbers for reconnection

Every mutation (create/move/edit/delete) is appended to an `events` table
with an auto-incrementing `seq`, and broadcast to all connected clients over
a single `event` socket channel. Clients track the highest `seq` they've
applied.

When a client reconnects after a dropped connection, it doesn't just reload
everything — it sends its last known `seq`, and the server replies with only
the events that happened after that point (`sync:incremental`). If the
client is too far behind (or it's a first load), the server instead sends a
full snapshot (`sync:full`). See `server.js` → `sync:request` handler.

This means a laptop that goes to sleep for 30 seconds, or a phone that drops
wifi, catches back up cheaply and correctly instead of re-fetching the whole
board or silently missing updates.

### 3. Ephemeral presence, separate from persisted state

Who's online, and which card someone is currently dragging, is tracked
in-memory on the server (a `Map` keyed by socket id) — never written to
SQLite. This is a deliberate separation: presence is inherently transient
and tied to a live connection, so persisting it would be both wasted work
and a source of stale-data bugs (e.g. "ghost" users who never cleanly
disconnected). It's broadcast on every connect/disconnect and on every drag
start/stop via a lightweight `presence:dragging` event.

---

## What I'd build next with more time

- Real CRDT-based merge (e.g. Yjs) instead of version-check rejection, so
  concurrent edits to *different fields* of the same card merge instead of
  one being rejected outright
- Auth + multi-board workspaces with per-user permissions
- Within-column reordering (currently a move always goes to the end of the
  target column)
- Offline queue: buffer mutations in IndexedDB while offline and flush on
  reconnect
