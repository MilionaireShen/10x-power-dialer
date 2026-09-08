import { useCallback, useEffect, useState } from "react";
import { PhoneCall, ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import { formatDuration } from "../lib/statusColors";
import adminService from "../services/adminService";

const STATUS_LABEL = {
  initiated: "Dialling",
  ringing: "Ringing",
  answered: "Connected",
  queued: "In queue",
};

export default function CallCenterLiveCalls() {
  const { notify } = useToast();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminService.liveCalls();
      setCalls(res?.data?.calls || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load live calls.";
      setError(message);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Calls start and end constantly, so this board has to keep up. Polled
  // rather than pushed, because the app has no realtime transport and adding
  // one for a screen somebody watches for a few minutes is not worth it.
  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  // The timer ticks locally between polls so the durations do not jump.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <ScreenHeader
        category="Call Center"
        title="Live Calls"
        actions={
          <div className="flex items-center gap-2">
            <span className="pill bg-[var(--color-success-tint)] text-[var(--color-success)]">
              {calls.length} in progress
            </span>
            <button onClick={load} className="btn-outline py-1.5 text-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : error ? (
            <div className="p-8"><EmptyState icon={PhoneCall} title="Could not load live calls" description={error} /></div>
          ) : calls.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={PhoneCall}
                title="No calls in progress"
                description="Active calls appear here the moment an agent connects."
              />
            </div>
          ) : (
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Direction</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Ring</th>
                  <th className="px-5 py-3 font-medium">Talk</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c, i) => {
                  // Every timer is derived from the call's real timestamps, so
                  // a page refresh reconstructs the same numbers instead of
                  // restarting at 0. `now` ticks once a second between polls.
                  const startedMs = c.started_at ? new Date(c.started_at).getTime() : null;
                  const answeredMs = c.answered_at ? new Date(c.answered_at).getTime() : null;
                  // Ring: dial → answer. Freezes once answered; still counting
                  // up while the call is unanswered.
                  const ringSeconds = startedMs
                    ? Math.max(0, Math.floor(((answeredMs ?? now) - startedMs) / 1000))
                    : null;
                  // Talk: answer → now. Nothing until the call connects.
                  const talkSeconds = answeredMs ? Math.max(0, Math.floor((now - answeredMs) / 1000)) : null;
                  // Total: dial → now.
                  const totalSeconds = startedMs ? Math.max(0, Math.floor((now - startedMs) / 1000)) : null;
                  const dash = <span className="text-[var(--color-text-tertiary)]">—</span>;
                  return (
                    <tr key={c.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{c.agent_name || "—"}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.campaign_name || "—"}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.lead_name || "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[var(--color-text-tertiary)]">
                        {c.direction === "inbound" ? c.phone_number_from : c.phone_number_called}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                          {c.direction === "inbound"
                            ? <><ArrowDownLeft size={12} className="text-[var(--color-accent)]" /> Inbound</>
                            : <><ArrowUpRight size={12} className="text-[var(--color-text-tertiary)]" /> Outbound</>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="pill bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
                          {STATUS_LABEL[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[var(--color-text-secondary)]">{ringSeconds != null ? formatDuration(ringSeconds) : dash}</td>
                      <td className="px-5 py-3.5 font-mono text-[var(--color-text-secondary)]">{talkSeconds != null ? formatDuration(talkSeconds) : dash}</td>
                      <td className="px-5 py-3.5 font-mono text-[var(--color-text-primary)]">{totalSeconds != null ? formatDuration(totalSeconds) : dash}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
