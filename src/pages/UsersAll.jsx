import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import UserPanel from "../components/UserPanel";
import userService from "../services/userService";
import campaignService from "../services/campaignService";

const ROLE_LABEL = { agent: "Agent", manager: "Manager", admin: "Admin", super_admin: "Super Admin" };
const ROLE_COLOR = { agent: "var(--color-info)", manager: "#0F766E", admin: "var(--color-accent)", super_admin: "var(--color-gold)" };

export default function UsersAll() {
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [usersRes, campaignsRes] = await Promise.all([userService.list(), campaignService.list()]);
      setUsers(usersRes.data || []);
      setCampaigns(campaignsRes.data || []);
    } catch {
      // leave whatever was last loaded on screen
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setEditingUser(null);
      setPanelOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("add");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = users.filter((u) => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (u) => {
    setEditingUser(u);
    setPanelOpen(true);
  };

  const openAdd = () => {
    setEditingUser(null);
    setPanelOpen(true);
  };

  const campaignNames = (ids) => {
    if (!ids || ids.length === 0) return "—";
    const names = campaigns.filter((c) => ids.includes(c.id)).map((c) => c.name);
    return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ") || "—";
  };

  return (
    <div>
      <ScreenHeader
        category="Users"
        title="All Users"
        actions={
          <button onClick={openAdd} className="btn-purple">
            <Plus size={15} /> Add New User
          </button>
        }
      />

      <div className="p-8 space-y-6">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="input-field pl-11" />
        </div>

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last Login</th>
                <th className="px-5 py-3 font-medium">Campaigns Assigned</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  className={`cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-accent-tint)]/40 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}
                  onClick={() => openEdit(u)}
                >
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="pill" style={{ backgroundColor: `color-mix(in srgb, ${ROLE_COLOR[u.role]} 14%, white)`, color: ROLE_COLOR[u.role] }}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="pill capitalize"
                      style={{
                        backgroundColor: u.status === "active" ? "var(--color-success-tint)" : "var(--color-danger-tint)",
                        color: u.status === "active" ? "var(--color-success)" : "var(--color-danger)",
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{u.role === "admin" || u.role === "super_admin" ? "All" : campaignNames(u.campaign_ids)}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(u);
                      }}
                      className="font-medium text-[var(--color-accent)] hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {loaded && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">
                    {users.length === 0 ? "No users yet." : `No users match “${search}”.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserPanel open={panelOpen} onClose={() => setPanelOpen(false)} editingUser={editingUser} campaigns={campaigns} onSaved={refresh} />
    </div>
  );
}
