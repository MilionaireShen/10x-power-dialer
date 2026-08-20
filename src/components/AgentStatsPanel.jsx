import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Flame, CalendarClock } from "lucide-react";
import Avatar from "./Avatar";
import { formatHMS } from "../lib/statusColors";

const CALLBACK_STATUS_COLOR = {
  Pending: "var(--color-info)",
  Completed: "var(--color-success)",
  Dismissed: "var(--color-danger)",
  Missed: "var(--color-warning)",
};

// Slides out from the left edge (where its trigger tab lives) — distinct
// from the right-anchored SidePanel used for actions/forms elsewhere.
export default function AgentStatsPanel({ open, onClose, stats, sessionInfo, leaderboard, myCallbacks = [] }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="side-panel-overlay animate-[fadeIn_0.3s_ease]" onClick={onClose} />
      <div className="fixed left-0 top-0 z-50 h-full w-full max-w-sm animate-[slideInLeft_0.3s_ease] overflow-y-auto border-r border-[var(--color-border)] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-5">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">My Stats</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Today&rsquo;s Performance
            </h3>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              <StatBox label="Calls Made" value={stats.calls} />
              <StatBox label="Connects" value={stats.connects} />
              <StatBox label="Booked" value={stats.booked} accent="text-[var(--color-success)]" />
              <StatBox label="Not Interested" value={stats.notInterested} />
              <StatBox label="No Answers" value={stats.noAnswers} />
              <StatBox label="Conversion" value={`${stats.conversionRate}%`} accent="text-[var(--color-accent)]" />
              <StatBox label="Avg. Duration" value={stats.avgDuration} />
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-[var(--color-text-secondary)]">
                <span>Daily goal</span>
                <span>
                  {stats.calls}/{stats.goal} calls
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, (stats.calls / stats.goal) * 100)}%` }}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Session Info
            </h3>
            <div className="space-y-2 rounded-lg bg-[var(--color-bg)] p-3 text-sm">
              <Row label="Time logged in today" value={formatHMS(sessionInfo.secondsLoggedIn)} />
              <Row label="Campaign active" value={sessionInfo.campaignName} />
              <Row
                label="Auto-logouts today"
                value={sessionInfo.autoLogoutCount}
                valueClass={sessionInfo.autoLogoutCount > 0 ? "text-[var(--color-danger)] font-semibold" : undefined}
              />
            </div>
          </section>

          {myCallbacks.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                My Callback Queue
              </h3>
              <div className="space-y-1.5">
                {myCallbacks.map((cb) => (
                  <div key={cb.id} className="flex items-center gap-2.5 rounded-lg bg-[var(--color-bg)] px-3 py-2">
                    <CalendarClock size={14} className="shrink-0 text-[var(--color-text-tertiary)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--color-text-primary)]">{cb.leadName}</p>
                      <p className="text-[11px] text-[var(--color-text-tertiary)]">{new Date(cb.scheduledAt).toLocaleString()}</p>
                    </div>
                    <span className="pill shrink-0 text-[10px]" style={{ color: CALLBACK_STATUS_COLOR[cb.status] }}>
                      {cb.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Mini Leaderboard
            </h3>
            {leaderboard.top3.length === 0 ? (
              <p className="rounded-lg bg-[var(--color-bg)] px-3 py-4 text-center text-sm text-[var(--color-text-tertiary)]">
                No calls made yet today
              </p>
            ) : (
              <>
                <div className="mb-3 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent-tint)] px-3 py-2 text-sm">
                  <span className="font-medium text-[var(--color-text-primary)]">Your rank today: </span>
                  <span className="font-semibold text-[var(--color-accent)]">#{leaderboard.myRank}</span>
                </div>
                <div className="space-y-1.5">
                  {leaderboard.top3.map((a, i) => (
                    <div key={a.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--color-bg)]">
                      <span className="w-4 text-sm font-semibold text-[var(--color-text-tertiary)]">{i + 1}</span>
                      <Avatar name={a.name} size={26} />
                      <span className="flex-1 truncate text-sm text-[var(--color-text-primary)]">{a.firstName}</span>
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                        <Flame size={12} className="text-[var(--color-warning)]" /> {a.booked} booked
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>,
    document.body
  );
}

function StatBox({ label, value, accent = "text-[var(--color-text-primary)]" }) {
  return (
    <div className="w-[86px] shrink-0 rounded-lg bg-[var(--color-bg)] px-3 py-2.5">
      <p className={`text-lg font-semibold ${accent}`}>{value}</p>
      <p className="text-[11px] leading-tight text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}

function Row({ label, value, valueClass = "text-[var(--color-text-primary)] font-medium" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
