const STATUS_COPY = {
  connecting: { label: 'Connecting…', color: '#A8AFC0' },
  synced: { label: 'Live', color: '#34D399' },
  reconnecting: { label: 'Reconnecting…', color: '#F87171' },
};

export default function PresenceBar({ status, presence }) {
  const s = STATUS_COPY[status] || STATUS_COPY.connecting;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }}
        />
        <span className="font-mono text-[11px] text-muted">{s.label}</span>
      </div>

      <div className="flex -space-x-2">
        {presence.map((p) => (
          <div
            key={p.socketId}
            title={p.name}
            className="w-7 h-7 rounded-full border-2 border-canvas flex items-center justify-center text-[10px] font-display font-semibold text-canvas"
            style={{ backgroundColor: p.color }}
          >
            {p.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
