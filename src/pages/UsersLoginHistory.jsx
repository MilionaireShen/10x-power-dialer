import { useCallback, useEffect, useState } from "react";
import { LogIn, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

const PAGE_SIZE = 25;

function duration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function UsersLoginHistory() {
  const { notify } = useToast();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (success) params.success = success;
      const res = await adminService.loginHistory(params);
      setEntries(res?.data?.entries || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load login history.";
      setError(message);
      notify(message, "error");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, success, notify]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <ScreenHeader category="Users" title="Login History" />
      <div className="space-y-4 p-8">
        <div className="card flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Outcome</span>
            <select
              value={success}
              onChange={(e) => { setPage(1); setSuccess(e.target.value); }}
              className="input-field py-2 text-sm"
            >
              <option value="">All attempts</option>
              <option value="true">Successful</option>
              <option value="false">Failed</option>
            </select>
          </label>
          <p className="ml-auto text-xs text-[var(--color-text-tertiary)]">
            {total} recorded attempt{total === 1 ? "" : "s"}
          </p>
        </div>

        <div className="card overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : error ? (
            <div className="p-8"><EmptyState icon={ShieldAlert} title="Could not load login history" description={error} /></div>
          ) : entries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={LogIn}
                title="No login history yet"
                description="Sign-ins are recorded here as users log in."
              />
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Signed In</th>
                  <th className="px-5 py-3 font-medium">Signed Out</th>
                  <th className="px-5 py-3 font-medium">Duration</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                  <th className="px-5 py-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">
                      {e.user_name || e.user?.email || "Unknown"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{e.user?.role || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[var(--color-text-secondary)]">
                      {new Date(e.login_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[var(--color-text-tertiary)]">
                      {e.logout_at ? new Date(e.logout_at).toLocaleString() : "Still signed in"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{duration(e.session_duration_seconds)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[var(--color-text-tertiary)]">{e.ip_address || "—"}</td>
                    <td className="px-5 py-3.5">
                      {e.login_success === false ? (
                        <span className="pill" style={{ backgroundColor: "var(--color-danger-tint)", color: "var(--color-danger)" }}>
                          Failed{e.failure_reason ? ` — ${e.failure_reason}` : ""}
                        </span>
                      ) : (
                        <span className="pill" style={{ backgroundColor: "var(--color-success-tint)", color: "var(--color-success)" }}>
                          Success
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
            <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} className="btn-outline py-1.5 disabled:opacity-40">
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs text-[var(--color-text-tertiary)]">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages} className="btn-outline py-1.5 disabled:opacity-40">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
