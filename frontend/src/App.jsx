import { useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import { socket, getUserName } from './socket.js';
import { useBoardStore, COLUMNS } from './store.js';
import Column from './components/Column.jsx';
import PresenceBar from './components/PresenceBar.jsx';

export default function App() {
  const cards = useBoardStore((s) => s.cards);
  const status = useBoardStore((s) => s.status);
  const presence = useBoardStore((s) => s.presence);
  const lastSeq = useBoardStore((s) => s.lastSeq);

  useEffect(() => {
    function requestSync() {
      // Passing lastSeq lets the server send only what we missed instead of
      // a full reload — this is what makes reconnects after a dropped
      // connection cheap and correct instead of "just refetch everything".
      socket.emit('sync:request', { lastSeq: useBoardStore.getState().lastSeq });
    }

    function onConnect() {
      useBoardStore.getState().setStatus('connecting');
      requestSync();
    }

    function onDisconnect() {
      useBoardStore.getState().setStatus('reconnecting');
    }

    function onFull({ cards, maxSeq }) {
      useBoardStore.getState().applyFullSync(cards, maxSeq);
    }

    function onIncremental({ events, maxSeq }) {
      useBoardStore.getState().applyIncremental(events, maxSeq);
    }

    function onEvent(event) {
      useBoardStore.getState().applyEvent(event, { remote: true });
    }

    function onPresence(list) {
      useBoardStore.getState().setPresence(list);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('sync:full', onFull);
    socket.on('sync:incremental', onIncremental);
    socket.on('event', onEvent);
    socket.on('presence:update', onPresence);

    if (socket.connected) requestSync();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sync:full', onFull);
      socket.off('sync:incremental', onIncremental);
      socket.off('event', onEvent);
      socket.off('presence:update', onPresence);
    };
  }, []);

  function handleDragStart(event) {
    socket.emit('presence:dragging', event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    socket.emit('presence:dragging', null);
    if (!over) return;

    const card = cards[active.id];
    if (!card) return;

    const targetColumn = over.id;
    if (targetColumn === card.column_id) return; // dropped back where it was

    const inTarget = Object.values(cards).filter((c) => c.column_id === targetColumn);
    const newPosition = inTarget.length === 0 ? 1 : Math.max(...inTarget.map((c) => c.position)) + 1;

    useBoardStore.getState().moveCard(card.id, targetColumn, newPosition);
  }

  const cardList = Object.values(cards).sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-canvas px-6 py-8 md:px-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
            SyncBoard
          </h1>
          <p className="text-muted text-[13px] mt-1 font-body">
            You're <span className="text-white/80">{getUserName()}</span> · open another tab to
            watch it sync live
          </p>
        </div>
        <PresenceBar status={status} presence={presence} />
      </header>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-4">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              column={column}
              cards={cardList.filter((c) => c.column_id === column.id)}
              presence={presence}
            />
          ))}
        </div>
      </DndContext>

      <footer className="mt-8 text-center font-mono text-[10.5px] text-muted/40">
        event log seq #{lastSeq}
      </footer>
    </div>
  );
}
