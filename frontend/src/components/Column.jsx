import { useDroppable } from '@dnd-kit/core';
import Card from './Card.jsx';
import AddCardForm from './AddCardForm.jsx';

const COLUMN_ACCENTS = {
  todo: '#6B7280',
  in_progress: '#E8B34C',
  done: '#34D399',
};

export default function Column({ column, cards, presence }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] bg-panel border border-panelBorder rounded-xl p-3.5 flex flex-col transition-colors ${
        isOver ? 'bg-panel/70 border-gold/40' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="font-display text-[13px] tracking-wide uppercase text-white/85">
          {column.label}
        </h2>
        <span className="font-mono text-[11px] text-muted/60">{cards.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-0.5 min-h-[80px]">
        {cards.map((card) => {
          const viewers = presence.filter(
            (p) => p.draggingCardId === card.id
          );
          return (
            <Card key={card.id} card={card} viewers={viewers} accent={COLUMN_ACCENTS[column.id]} />
          );
        })}
      </div>

      <AddCardForm columnId={column.id} />
    </div>
  );
}
