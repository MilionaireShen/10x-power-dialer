import { useCallback, useEffect, useState } from "react";
import { PhoneIncoming, Clock, User, RefreshCw, AlertTriangle } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import inboundService from "../services/inboundService";

// Refreshed on a timer because inbound state changes without the supervisor
// doing anything — a caller arrives, an agent picks up, someone gives up
// waiting. A page that only updated on click would routinely be wrong.
const POLL_MS = 3000;

const STATUS_META = {
  waiting: { color: "#D97706", label: "Waiting" },
  ringing: { color: "#7C3AED", label: "Ringing" },
  connected: { color: "#059669", label: "Connected" },
  answered: { color: "#059669", label: "Connected" },
  abandoned: { color: "#DC2626", label: "Abandoned" },
  timed_out: { color: "#DC2626", label: "Timed Out" },
  queued: { color: "#D97706", label: "Queued" },
};

function formatWait(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? { color: "#6B7280", label: status };
  return (
    <span className="pill text-[11px]" style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 14%, white)`, color: meta.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

export default function CallCenterInboundQueue() {
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    inboundService
      .live()
      .then((res) => {
        setQueue(res?.data?.queue ?? []);
        setActive(res?.data?.active ?? []);
        setError(null);
      })
      .catch((err) => setError(err?.message || "Could not load inbound activity."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const longestWait = queue.reduce((max, q) => Math.max(max, q.wait_seconds || 0), 0);

  return (
    <div>
      <ScreenHeader category="Call Center" title="Live Inbound" />
      <div className="p-8">
        <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">In Queue</p>
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{queue.length}</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Longest Wait</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: longestWait > 60 ? "#DC2626" : "var(--color-text-primary)" }}>
              {formatWait(longestWait)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Active Calls</p>
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{active.length}</p>
          </div>
          <div className="card flex items-center justify-center">
            <button onClick={load} className="btn-gray text-xs"><RefreshCw size={13} /> Refresh</button>
          </div>
        </div>

        {error && (
          <div className="card mb-4 flex items-center gap-2 border-l-4 border-[var(--color-danger)] text-sm text-[var(--color-danger)]">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Waiting in Queue
        </h3>
        {queue.length === 0 ? (
          <div className="card mb-6 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            {loading ? "Loading…" : "No callers waiting."}
          </div>
        ) : (
          <div className="card mb-6 divide-y divide-[var(--color-border)] p-0">
            {queue.map((q, i) => (
              <div key={q.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-6 shrink-0 text-center font-mono text-sm text-[var(--color-text-tertiary)]">{i + 1}</span>
                <PhoneIncoming size={15} className="shrink-0 text-[var(--color-accent)]" />
                <div className="min-w-[150px]">
                  <p className="font-medium text-[var(--color-text-primary)]">{q.caller_number}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{q.campaign_name || "—"}</p>
                </div>
                <div className="flex-1" />
                {/* Surfaced because a callback waiting for a specific agent is
                    a different situation from a caller anyone can take. */}
                {q.preferred_agent_id && (
                  <span className="pill bg-[var(--color-bg)] text-[11px] text-[var(--color-text-secondary)]">
                    <User size={11} /> callback
                  </span>
                )}
                {q.agent_name && (
                  <span className="text-sm text-[var(--color-text-secondary)]">→ {q.agent_name}</span>
                )}
                <StatusPill status={q.status} />
                <span className="flex w-16 shrink-0 items-center justify-end gap-1 font-mono text-sm"
                  style={{ color: (q.wait_seconds || 0) > 60 ? "#DC2626" : "var(--color-text-secondary)" }}>
                  <Clock size={12} /> {formatWait(q.wait_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}

        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Active Inbound Calls
        </h3>
        {active.length === 0 ? (
          <div className="card py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            {loading ? "Loading…" : "No inbound calls in progress."}
          </div>
        ) : (
          <div className="card divide-y divide-[var(--color-border)] p-0">
            {active.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                <PhoneIncoming size={15} className="shrink-0 text-[var(--color-success,#059669)]" />
                <div className="min-w-[150px]">
                  <p className="font-medium text-[var(--color-text-primary)]">{c.caller}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{c.campaign_name || "—"}</p>
                </div>
                <p className="flex-1 truncate text-sm text-[var(--color-text-secondary)]">
                  {c.agent_name ? `→ ${c.agent_name}` : "unassigned"}
                </p>
                {c.queue_seconds !== null && c.queue_seconds !== undefined && (
                  <span className="text-[11px] text-[var(--color-text-tertiary)]">waited {formatWait(c.queue_seconds)}</span>
                )}
                <StatusPill status={c.status} />
                <span className="w-16 shrink-0 text-right font-mono text-sm text-[var(--color-text-secondary)]">
                  {formatWait(c.elapsed_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && queue.length === 0 && active.length === 0 && !error && (
          <div className="mt-6">
            <EmptyState
              title="No inbound activity"
              description="Callers appear here as soon as they dial a DID mapped to an inbound campaign."
            />
          </div>
        )}
      </div>
    </div>
  );
}
