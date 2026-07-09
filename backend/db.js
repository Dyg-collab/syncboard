import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'syncboard.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    position REAL NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Seed a couple of example cards on first run so the board isn't empty
const seeded = db.prepare('SELECT COUNT(*) AS n FROM cards').get();
if (seeded.n === 0) {
  const seedCards = [
    { id: 'c1', column_id: 'todo', title: 'Design the sync protocol', position: 1 },
    { id: 'c2', column_id: 'todo', title: 'Write the README', position: 2 },
    { id: 'c3', column_id: 'in_progress', title: 'Wire up Socket.IO events', position: 1 },
    { id: 'c4', column_id: 'done', title: 'Scaffold the project', position: 1 },
  ];
  const insert = db.prepare(`
    INSERT INTO cards (id, column_id, title, description, position, version, updated_at, updated_by)
    VALUES (@id, @column_id, @title, '', @position, 1, @updated_at, NULL)
  `);
  const now = Date.now();
  for (const c of seedCards) insert.run({ ...c, updated_at: now });
}

export default db;
