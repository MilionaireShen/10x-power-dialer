import ScreenHeader from "../components/ScreenHeader";
import { AGENTS } from "../data/mockData";
import { useAppData } from "../lib/AppDataContext";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../lib/ToastContext";
import { secondsSince, formatHMS } from "../lib/statusColors";

const ROLE_LABEL = { agent: "Agent", manager: "Manager", admin: "Admin", super_admin: "Super Admin" };

export default function UsersSessions() {
  const { users, forceAgentLogout } = useAppData();
  const { user: currentUser } = useAuth();
  const { notify } = useToast();

  const activeUsers = users.filter((u) => u.status === "Active");

  const agentSession = (name) => AGENTS.find((a) => a.name === name);

  return (
    <div>
      <ScreenHeader category="Users" title="Active Sessions" actions={<span className="pill bg-[var(--color-success-tint)] text-[var(--color-success)]">{activeUsers.length} active</span>} />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Session Length</th>
                <th className="px-5 py-3 font-medium">Last Login</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u, i) => {
                const fullName = `${u.firstName} ${u.lastName}`;
                const agent = agentSession(fullName);
                return (
                  <tr key={u.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{fullName}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{ROLE_LABEL[u.role]}</td>
                    <td className="px-5 py-3.5 font-mono text-[var(--color-text-secondary)]">
                      {agent ? formatHMS(secondsSince(agent.sessionStart)) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => {
                          if (u.email === currentUser?.email) {
                            notify("You can't force logout your own session.", "warning");
                            return;
                          }
                          if (agent) forceAgentLogout(currentUser.name, fullName);
                          notify(`${fullName}'s session was terminated.`, "error");
                        }}
                        className="font-medium text-[var(--color-danger)] hover:underline"
                      >
                        Force Logout
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
