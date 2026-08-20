import { useEffect, useState } from "react";
import { Headphones, Radio, LogIn, Mic, MicOff, X } from "lucide-react";
import { secondsSince, formatHMS } from "../lib/statusColors";

const TYPE_LABEL = { listen: "Listening", whisper: "Whispering", barge: "Barged In" };

// Same icon set/meaning as AgentMonitorTable's Listen/Whisper/Barge column.
const MODES = [
  { key: "listen", icon: Headphones, label: "Listen" },
  { key: "whisper", icon: Radio, label: "Whisper" },
  { key: "barge", icon: LogIn, label: "Barge" },
];

// Fixed at the top of the admin screen, stacked by index — an admin can
// have several of these open at once, one per agent being monitored.
export default function MonitoringBar({ session, index, onStop, onSwitchMode }) {
  const [muted, setMuted] = useState(false);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed left-1/2 z-[95] flex w-[420px] -translate-x-1/2 items-center gap-3 rounded-lg border border-[var(--color-accent)]/30 bg-white px-4 py-2.5 shadow-lg"
      style={{ top: `${12 + index * 56}px` }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
        <Headphones size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
          {TYPE_LABEL[session.type]}: {session.agentName}
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{formatHMS(secondsSince(session.startedAt))}</p>
      </div>
      {onSwitchMode && (
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--color-border-strong)] p-0.5">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = session.type === m.key;
            return (
              <button
                key={m.key}
                onClick={() => !active && onSwitchMode(m.key)}
                aria-label={`Switch to ${m.label}`}
                title={m.label}
                className={`rounded-full p-1.5 transition-colors ${
                  active ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)]"
                }`}
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setMuted((m) => !m)}
        className={`rounded-full p-2 transition-colors ${muted ? "bg-[var(--color-danger-tint)] text-[var(--color-danger)]" : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)]"}`}
        aria-label="Mute self"
        title="Mute self"
      >
        {muted ? <MicOff size={15} /> : <Mic size={15} />}
      </button>
      <button onClick={onStop} className="btn-gray py-1.5 px-3 text-xs">
        <X size={13} /> Stop
      </button>
    </div>
  );
}
