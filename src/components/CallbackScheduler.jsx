import { useState } from "react";
import { Globe } from "lucide-react";
import MiniCalendar from "./MiniCalendar";

function combineDateTime(date, time) {
  const [h, m] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(h, m, 0, 0);
  return combined;
}

export default function CallbackScheduler({ lead, onSchedule, onCancel }) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    return d;
  });
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  // Auto-detected from the lead's location — timezone label already carries
  // this (e.g. "PT · 10:42 AM local").
  const timezoneLabel = (lead.timezone || "").split("·")[0].trim() || "Local";

  const handleSchedule = () => {
    const scheduledAt = combineDateTime(date, time);
    onSchedule(scheduledAt.getTime(), timezoneLabel);
  };

  return (
    <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent-tint)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Schedule Callback</p>

      <MiniCalendar value={date} onChange={setDate} minDate={new Date(new Date().setHours(0, 0, 0, 0))} />

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Time</label>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input-field" />
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
        <Globe size={12} />
        Time zone: {timezoneLabel} (auto-detected from lead location)
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={handleSchedule} className="btn-purple flex-1">
          Schedule Callback
        </button>
        <button onClick={onCancel} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
