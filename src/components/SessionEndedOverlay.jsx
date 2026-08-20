import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

// Blocking, undismissable overlay shown the instant wrap-up hits 0:00. The
// auth session isn't actually torn down until the agent clicks through —
// that keeps this component (still inside RequireRole's protected tree)
// able to render the message instead of getting redirected out from under
// itself the moment logout() fires.
export default function SessionEndedOverlay({ open, onLogBackIn }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl bg-white p-8 text-center shadow-2xl">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-danger-tint)] text-[var(--color-danger)]">
          <AlertTriangle size={36} />
        </span>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Session Ended</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          You did not complete wrap-up in time. You have been automatically logged out.
        </p>
        <button onClick={onLogBackIn} className="btn-purple mt-6 w-full py-3">
          Log Back In
        </button>
      </div>
    </div>,
    document.body
  );
}
