import { useEffect, useMemo, useState } from "react";
import adminService from "../services/adminService";

// Reads the callbacks table. This previously rendered a seeded array held in
// React state, so a callback an agent booked was invisible to supervisors and
// gone on refresh — a promised call-back that nothing would ever surface.

// The database stores lowercase status values; the filter and the pills below
// are the words an operator reads.
const STATUS_COLOR = {
  pending: "var(--color-info)",
  completed: "var(--color-success)",
  dismissed: "var(--color-danger)",
  missed: "var(--color-warning)",
};

const STATUS_LABEL = {
  pending: "Pending",
  completed: "Completed",
  dismissed: "Dismissed",
  missed: "Missed",
};

function personName(p) {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

export default function AdminCallbackTracking() {
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [agentFilter, setAgentFilter] = useState("All Agents");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminService
      .listCallbacks({ page_size: 200 })
      .then((res) => {
        if (cancelled) return;
        setCallbacks(res?.data?.callbacks || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || "Could not load callbacks.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Drawn from the callbacks themselves, so the filter can only offer agents
  // who actually appear in the list below.
  const agentNames = useMemo(
    () => [...new Set(callbacks.map((c) => personName(c.agent)).filter(Boolean))].sort(),
    [callbacks]
  );

  const filtered = useMemo(() => {
    const fromMs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const toMs = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

    return callbacks
      .map((c) => ({ ...c, _scheduled: new Date(c.scheduled_for).getTime() }))
      .filter((c) => agentFilter === "All Agents" || personName(c.agent) === agentFilter)
      .filter((c) => statusFilter === "All Statuses" || STATUS_LABEL[c.status] === statusFilter)
      .filter((c) => fromMs === null || c._scheduled >= fromMs)
      .filter((c) => toMs === null || c._scheduled <= toMs)
      .sort((a, b) => b._scheduled - a._scheduled);
  }, [callbacks, agentFilter, statusFilter, dateFrom, dateTo]);

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Callbacks</h2>
      <div className="card mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="input-field">
            <option>All Agents</option>
            {agentNames.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
            <option>All Statuses</option>
            <option>Pending</option>
            <option>Completed</option>
            <option>Dismissed</option>
            <option>Missed</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
              <th className="px-5 py-3 font-medium">Agent</th>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Scheduled</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">Loading…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-danger)]">{error}</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">
                  {callbacks.length === 0 ? "No callbacks scheduled yet." : "No callbacks match these filters."}
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{personName(c.agent)}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{personName(c.lead)}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{c.lead?.phone_number}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{new Date(c.scheduled_for).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <StatusCell callback={c} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusCell({ callback }) {
  const color = STATUS_COLOR[callback.status] || "var(--color-info)";

  // The timestamp is only shown when there is one — a dismissed callback from
  // before that column was recorded should read "Dismissed", not
  // "Dismissed · Invalid Date".
  if (callback.status === "dismissed") {
    return (
      <span className="text-xs font-medium text-[var(--color-danger)]">
        Dismissed by agent
        {callback.popup_dismissed_at ? ` · ${new Date(callback.popup_dismissed_at).toLocaleString()}` : ""}
      </span>
    );
  }
  if (callback.status === "completed") {
    return (
      <span className="text-xs font-medium text-[var(--color-success)]">
        Called
        {callback.completed_at ? ` · ${new Date(callback.completed_at).toLocaleString()}` : ""}
      </span>
    );
  }
  return (
    <span className="pill" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, white)`, color }}>
      {STATUS_LABEL[callback.status] || callback.status}
    </span>
  );
}
