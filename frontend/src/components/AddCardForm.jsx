import { useState } from 'react';
import { useBoardStore } from '../store.js';

export default function AddCardForm({ columnId }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const createCard = useBoardStore((s) => s.createCard);

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    createCard(columnId, title.trim());
    setTitle('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-[13px] font-body text-muted/70 hover:text-gold transition-colors py-2"
      >
        + Add a card
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-1">
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) submit(e);
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Describe the task…"
        rows={2}
        className="w-full rounded-lg bg-paper text-ink text-[13.5px] font-body px-3 py-2.5 shadow-md outline-none resize-none placeholder:text-ink/40"
      />
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          className="text-[12px] font-body font-medium bg-gold text-canvas px-3 py-1.5 rounded-md hover:brightness-110 transition"
        >
          Add card
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
          className="text-[12px] font-body text-muted hover:text-white px-2 py-1.5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
