import { PhoneCall, X, CalendarClock } from "lucide-react";

// Fixed bottom-right notification — deliberately never covers the call
// panel or script, and stays until the agent acts on it.
export default function CallbackPopup({ callback, onDialNow, onDismiss }) {
  if (!callback) return null;

  return (
    <div className="fixed bottom-24 right-5 z-[90] w-80 animate-toast-in rounded-lg border border-[var(--color-accent)]/30 bg-white p-4 shadow-2xl">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
          <CalendarClock size={14} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">Scheduled Callback — Due Now</p>
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{callback.leadName}</p>
      <p className="text-sm text-[var(--color-text-secondary)]">{callback.phone}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={onDialNow} className="btn-purple flex-1 py-2 text-sm">
          <PhoneCall size={14} /> Dial Now
        </button>
        <button onClick={onDismiss} className="btn-gray py-2 text-sm">
          <X size={14} /> Dismiss
        </button>
      </div>
    </div>
  );
}
