import { useMemo, useState } from "react";
import { useAppData } from "../lib/AppDataContext";

const STATUS_COLOR = {
  Pending: "var(--color-info)",
  Completed: "var(--color-success)",
  Dismissed: "var(--color-danger)",
  Missed: "var(--color-warning)",
};

export default function AdminCallbackTracking() {
  const { callbacks } = useAppData();
  const [agentFilter, setAgentFilter] = useState("All Agents");

  // Drawn from the callbacks themselves, so the filter can only offer agents
  // who actually appear in the list below.
  const agentNames = useMemo(
    () => [...new Set(callbacks.map((c) => c.agentName).filter(Boolean))].sort(),
    [callbacks]
  );
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return callbacks
      .filter((c) => agentFilter === "All Agents" || c.agentName === agentFilter)
      .filter((c) => statusFilter === "All Statuses" || c.status === statusFilter)
      .filter((c) => !dateFrom || c.scheduledAt >= new Date(dateFrom).setHours(0, 0, 0, 0))
      .filter((c) => !dateTo || c.scheduledAt <= new Date(dateTo).setHours(23, 59, 59, 999))
      .sort((a, b) => b.scheduledAt - a.scheduledAt);
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">
                  No callbacks match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{c.agentName}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.leadName}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{c.phone}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{new Date(c.scheduledAt).toLocaleString()}</td>
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
  const color = STATUS_COLOR[callback.status];

  if (callback.status === "Dismissed") {
    return (
      <span className="text-xs font-medium text-[var(--color-danger)]">
        Dismissed by agent · {new Date(callback.dismissedAt).toLocaleString()}
      </span>
    );
  }
  if (callback.status === "Completed") {
    return (
      <span className="text-xs font-medium text-[var(--color-success)]">
        Called · {new Date(callback.completedAt).toLocaleString()}
      </span>
    );
  }
  return (
    <span className="pill" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, white)`, color }}>
      {callback.status}
    </span>
  );
}
