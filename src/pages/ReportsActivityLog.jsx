import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import adminService from "../services/adminService";

// Reads user_activity_log, which the backend has been writing on every
// privileged action all along. This screen rendered an empty array held in
// React state, so the audit trail existed but was invisible.

// action_type is stored as a slug; shown here as words rather than raw
// database values.
function humanAction(type) {
  if (!type) return "";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// The target of an action lives in the metadata, whose shape varies by action.
// Whichever recognisable name is present is used; otherwise the cell is blank
// rather than filled with an id.
function targetOf(entry) {
  const m = entry.metadata || {};
  return m.agent_name || m.target_name || m.campaign_name || m.user_name || "";
}

export default function ReportsActivityLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    adminService
      .activity({ page_size: 200 })
      .then((res) => {
        if (cancelled) return;
        setEntries(res?.data?.entries || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || "Could not load the activity log.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <ScreenHeader category="Reports" title="Admin Activity Log" />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          {loading ? (
            <div className="p-8 text-center text-[var(--color-text-tertiary)]">Loading…</div>
          ) : error ? (
            <div className="p-8 text-center text-[var(--color-danger)]">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-tertiary)]">
              No admin monitoring or account actions logged yet.
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                  <th className="px-5 py-3 font-medium">Admin</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Target Agent</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{entry.user_name || "System"}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{humanAction(entry.action_type)}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{targetOf(entry)}</td>
                    <td className="max-w-[260px] truncate px-5 py-3.5 text-[var(--color-text-tertiary)]">{entry.action_description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
