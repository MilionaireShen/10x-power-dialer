import { useCallback, useEffect, useState } from "react";
import { Users as UsersIcon, RefreshCw } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../lib/ToastContext";
import { formatHMS } from "../lib/statusColors";
import api from "../services/api";
import adminService from "../services/adminService";

const ROLE_LABEL = { agent: "Agent", manager: "Manager", admin: "Admin", super_admin: "Super Admin" };

export default function UsersSessions() {
  const { user: currentUser } = useAuth();
  const { notify } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ending, setEnding] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminService.sessions();
      setSessions(res?.data?.sessions || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load active sessions.";
      setError(message);
      notify(message, "error");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  // Session length ticks locally off the real session_start rather than being
  // re-fetched every second.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Sessions open and close as agents work; refreshed so the list does not go
  // stale while a supervisor is watching it.
  useEffect(() => {
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const forceLogout = async (session) => {
    setEnding(session.id);
    try {
      await api.post(`/admin/sessions/${session.id}/force-logout`);
      notify(`${session.agent_name || "That user"}'s session was ended.`, "success");
      load();
    } catch (err) {
      // The server refuses while the agent is on a live call, and says so —
      // passed through rather than replaced with a generic failure.
      notify(err?.response?.data?.message || "Could not end that session.", "error");
    } finally {
      setEnding(null);
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Users"
        title="Active Sessions"
        actions={
          <div className="flex items-center gap-2">
            <span className="pill bg-[var(--color-success-tint)] text-[var(--color-success)]">
              {sessions.length} active
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
            <div className="p-8"><EmptyState icon={UsersIcon} title="Could not load sessions" description={error} /></div>
          ) : sessions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={UsersIcon}
                title="Nobody is signed in right now"
                description="Sessions appear here while agents are logged into the dialer."
              />
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Session Length</th>
                  <th className="px-5 py-3 font-medium">Calls Today</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const isMe = s.agent?.id === currentUser?.id;
                  const elapsed = Math.max(0, Math.floor((now - new Date(s.session_start).getTime()) / 1000));
                  return (
                    <tr key={s.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">
                        {s.agent_name || s.agent?.email || "Unknown"}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{ROLE_LABEL[s.agent?.role] || s.agent?.role || "—"}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{s.campaign?.name || "—"}</td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={s.current_status} since={new Date(s.status_changed_at).getTime()} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[var(--color-text-secondary)]">{formatHMS(elapsed)}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{s.calls_made_today ?? 0}</td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => forceLogout(s)}
                          disabled={isMe || ending === s.id}
                          title={isMe ? "You cannot end your own session here" : "End this session"}
                          className="font-medium text-[var(--color-danger)] hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                        >
                          {ending === s.id ? "Ending…" : "Force Logout"}
                        </button>
                      </td>
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
