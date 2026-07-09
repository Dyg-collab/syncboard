# SyncBoard

A real-time collaborative Kanban board built with **React, Node.js, Socket.IO, and SQLite**. Multiple users can create, edit, move, and delete cards with instant synchronization across connected clients.

## Live Demo

- **Frontend:** <https://syncboard-lime.vercel.app>
- **Backend API:** <https://syncboard-qu8x.onrender.com>
- **Health Check:** <https://syncboard-qu8x.onrender.com/health>

## Features

- Real-time collaboration using Socket.IO
- Drag-and-drop Kanban board with @dnd-kit
- Optimistic UI updates for responsive interactions
- Version-based conflict detection for concurrent edits
- Incremental synchronization after reconnects
- Live user presence indicators
- SQLite-backed persistent board state
- Responsive UI built with Tailwind CSS

## Tech Stack

### Frontend
- React (Vite)
- Zustand
- @dnd-kit
- Tailwind CSS
- Socket.IO Client

### Backend
- Node.js
- Express.js
- Socket.IO
- SQLite (better-sqlite3)

## Run Locally

### Backend

```bash
cd backend
npm install
npm start
```

Runs on **http://localhost:4000**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:5173**

Open the application in two browser windows (or one normal window and one incognito window) to experience real-time collaboration.

## Deployment

- **Frontend:** Vercel
- **Backend:** Render

> **Note:** The backend uses SQLite. On Render's free tier, the database is recreated after service restarts because the filesystem is ephemeral. For production deployments, a managed PostgreSQL database or Render Disk should be used.

## Project Structure

```
syncboard/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Future Improvements

- User authentication
- Multiple boards and workspaces
- Within-column drag reordering
- Offline support with IndexedDB
- PostgreSQL for persistent cloud storage

## License

This project is intended for learning and portfolio purposes.
