import { useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { seedLoginHistory } from "../data/mockData";
import { useAppData } from "../lib/AppDataContext";

const ROLE_LABEL = { agent: "Agent", manager: "Manager", admin: "Admin", super_admin: "Super Admin" };

export default function UsersLoginHistory() {
  const { users } = useAppData();
  const [userFilter, setUserFilter] = useState("All Users");

  const rows = users
    .filter((u) => userFilter === "All Users" || `${u.firstName} ${u.lastName}` === userFilter)
    .flatMap((u) => seedLoginHistory(`${u.firstName} ${u.lastName}`, 3).map((entry) => ({ ...entry, user: u })));

  rows.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div>
      <ScreenHeader category="Users" title="Login History" />
      <div className="p-8 space-y-4">
        <div className="card flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">User</label>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="input-field">
              <option>All Users</option>
              {users.map((u) => (
                <option key={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">
                    {r.user.firstName} {r.user.lastName}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{ROLE_LABEL[r.user.role]}</td>
                  <td className="px-5 py-3.5 font-mono text-[var(--color-text-tertiary)]">{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
