import { Play, Download } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { RECENT_CALLS } from "../data/mockData";
import { useToast } from "../lib/ToastContext";

export default function ReportsCallRecordings() {
  const { notify } = useToast();
  const recordings = RECENT_CALLS.slice(0, 16);

  return (
    <div>
      <ScreenHeader category="Reports" title="Call Recordings" />
      <div className="p-8">
        <div className="card divide-y divide-[var(--color-border)] p-0">
          {recordings.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
              <button
                onClick={() => notify(`Playing recording for call with ${c.lead}.`, "info")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent)] hover:opacity-80"
              >
                <Play size={14} />
              </button>
              <div className="min-w-[160px]">
                <p className="font-medium text-[var(--color-text-primary)]">{c.agent}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{c.time}</p>
              </div>
              <p className="flex-1 truncate text-sm text-[var(--color-text-secondary)]">→ {c.lead} · {c.campaign}</p>
              <span className="pill text-[11px]" style={{ backgroundColor: `color-mix(in srgb, ${c.dispositionColor} 14%, white)`, color: c.dispositionColor }}>
                {c.disposition}
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-sm text-[var(--color-text-secondary)]">{c.duration}</span>
              <button
                onClick={() => notify("Recording downloaded (demo).", "success")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
              >
                <Download size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
