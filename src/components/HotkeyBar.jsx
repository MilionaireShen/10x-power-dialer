// Horizontal row of quick-dispose hotkey buttons above the disposition
// list. Only functional during wrap-up — during a live call it's rendered
// dimmed as a preview of what's coming next.
export default function HotkeyBar({ hotkeys, active, flashingId, onPress }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Quick Dispose (Hotkeys)</p>
      <div className={`flex flex-wrap gap-2 transition-opacity duration-200 ${active ? "" : "opacity-40"}`}>
        {hotkeys
          .filter((h) => h.active)
          .map((h) => (
            <button
              key={h.id}
              type="button"
              disabled={!active}
              onClick={() => active && onPress(h)}
              title={`Press ${h.keyBinding} to select`}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-transform disabled:cursor-not-allowed ${
                active ? "hover:scale-[1.03] active:scale-95" : ""
              } ${flashingId === h.id ? "animate-hotkey-flash" : ""}`}
              style={{ backgroundColor: h.color }}
            >
              <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">{h.keyBinding}</span>
              {h.label}
            </button>
          ))}
      </div>
    </div>
  );
}
