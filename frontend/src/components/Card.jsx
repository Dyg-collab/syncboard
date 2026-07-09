import { useDraggable } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { useBoardStore } from '../store.js';

export default function Card({ card, viewers, accent }) {
  const clearRecentlyUpdated = useBoardStore((s) => s.clearRecentlyUpdated);
  const recentlyUpdated = useBoardStore((s) => s.recentlyUpdated[card.id]);
  const deleteCard = useBoardStore((s) => s.deleteCard);
  const [pulse, setPulse] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  useEffect(() => {
    if (recentlyUpdated) {
      setPulse(true);
      const t = setTimeout(() => {
        setPulse(false);
        clearRecentlyUpdated(card.id);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [recentlyUpdated]);

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: card._optimistic ? 0.6 : isDragging ? 0.4 : 1,
    borderLeftColor: accent || '#6B7280',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative bg-paper text-ink rounded-lg px-3.5 py-3 mb-2.5 shadow-md cursor-grab active:cursor-grabbing border-l-4 ${
        pulse ? 'animate-syncpulse' : ''
      }`}
      data-column={card.column_id}
    >
      {viewers.length > 0 && (
        <div className="absolute -top-2 -right-2 flex -space-x-1.5">
          {viewers.map((v) => (
            <div
              key={v.socketId}
              title={`${v.name} is moving this card`}
              className="w-4 h-4 rounded-full border-2 border-canvas"
              style={{ backgroundColor: v.color }}
            />
          ))}
        </div>
      )}

      <p className="font-body text-[13.5px] leading-snug pr-2">{card.title}</p>

      <div className="mt-2 flex items-center justify-between text-[10.5px] font-mono text-ink/40">
        <span>v{card.version}</span>
        <button
          onClick={() => deleteCard(card.id)}
          onPointerDown={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
        >
          remove
        </button>
      </div>
    </div>
  );
}