import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Avatar from "./Avatar";
import reportService from "../services/reportService";

const PERIODS = ["Today", "Week", "Month"];

function dateRangeForPeriod(period) {
  const end = new Date();
  const endStr = end.toISOString().slice(0, 10);
  const start = new Date(end);
  if (period === "Week") start.setDate(start.getDate() - 6);
  else if (period === "Month") start.setDate(start.getDate() - 29);
  return { date_from: start.toISOString().slice(0, 10), date_to: endStr };
}

const EMPTY_MESSAGE = {
  Today: "No calls made yet today",
  Week: "No calls made yet this week",
  Month: "No calls made yet this month",
};

// Slides in from the left like AgentStatsPanel — the full org leaderboard as
// an overlay instead of a separate routed page, per the agent-screen redesign.
// Pulls from the real GET /reports/leaderboard endpoint rather than the
// LEADERBOARD mock array — an org with no calls yet shows the empty state
// below instead of fabricated names and booked counts.
export default function AgentLeaderboardPanel({ open, onClose, currentAgentName }) {
  const [period, setPeriod] = useState("Today");
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoaded(false);
    reportService
      .leaderboard(dateRangeForPeriod(period))
      .then((res) => {
        if (!cancelled) setRows(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, period]);

  if (!open) return null;

  const myRank = rows.find((r) => r.agent_name === currentAgentName)?.rank;

  return createPortal(
    <>
      <div className="side-panel-overlay animate-[fadeIn_0.3s_ease]" onClick={onClose} />
      <div className="fixed left-0 top-0 z-50 h-full w-full max-w-sm animate-[slideInLeft_0.3s_ease] overflow-y-auto border-r border-[var(--color-border)] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-5">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Leaderboard</h2>
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
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {period}&rsquo;s Leaderboard
              </h3>
              {myRank && (
                <span className="text-xs font-medium text-[var(--color-accent)]">Your rank: #{myRank}</span>
              )}
            </div>

            <div className="mb-4 flex overflow-hidden rounded-full border border-[var(--color-border-strong)]">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                    period === p ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {!loaded && <p className="py-6 text-center text-sm text-[var(--color-text-tertiary)]">Loading leaderboard…</p>}

            {loaded && rows.length === 0 && (
              <p className="rounded-lg bg-[var(--color-bg)] px-3 py-6 text-center text-sm text-[var(--color-text-tertiary)]">
                {EMPTY_MESSAGE[period]}
              </p>
            )}

            {loaded && rows.length > 0 && (
              <div className="max-h-[calc(100vh-260px)] space-y-1 overflow-y-auto">
                {rows.map((a) => {
                  const isMe = a.agent_name === currentAgentName;
                  return (
                    <div
                      key={a.rank}
                      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 ${
                        isMe ? "border border-[var(--color-accent)]/30 bg-[var(--color-accent-tint)]" : "hover:bg-[var(--color-bg)]"
                      }`}
                    >
                      <span className="w-5 text-sm font-semibold text-[var(--color-text-tertiary)]">{a.rank}</span>
                      <Avatar name={a.agent_name} size={30} />
                      <span className={`flex-1 truncate text-sm ${isMe ? "font-semibold text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
                        {a.agent_name.split(" ")[0]}
                        {isMe && <span className="ml-1.5 text-xs font-normal text-[var(--color-text-tertiary)]">(You)</span>}
                      </span>
                      <span className="text-sm font-semibold text-[var(--color-success)]">{a.booked} booked</span>
                    </div>
                  );
                })}
              </div>
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
