import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import UserPanel from "../components/UserPanel";
import DeleteUserDialog from "../components/DeleteUserDialog";
import userService from "../services/userService";
import campaignService from "../services/campaignService";
import { useAuth } from "../lib/AuthContext";
import { hasPermission } from "../lib/permissions";

const ROLE_LABEL = { agent: "Agent", manager: "Manager", admin: "Admin", super_admin: "Super Admin" };
const ROLE_COLOR = { agent: "var(--color-info)", manager: "#0F766E", admin: "var(--color-accent)", super_admin: "var(--color-gold)" };
const ROLE_RANK = { agent: 0, manager: 1, admin: 2, super_admin: 3 };

export default function UsersAll() {
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const canCreate = hasPermission(me, "can_create_users");
  const canManagePermissions = hasPermission(me, "can_manage_permissions");
  const canDeleteUsers = hasPermission(me, "can_delete_users");

  // Mirrors the backend rule: you can't delete yourself, and you can't delete
  // an account at or above your own level unless you're a super admin.
  const canDeleteTarget = (u) =>
    canDeleteUsers &&
    u.id !== me?.id &&
    (me?.role === "super_admin" || (ROLE_RANK[u.role] ?? 0) < (ROLE_RANK[me?.role] ?? 0));

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
          canCreate ? (
            <button onClick={openAdd} className="btn-purple">
              <Plus size={15} /> Add New User
            </button>
          ) : null
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
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(u)} className="font-medium text-[var(--color-accent)] hover:underline">
                        Edit
                      </button>
                      {u.role === "manager" && canManagePermissions && (
                        <button
                          onClick={() => navigate(`/admin/users/permissions?user=${u.id}`)}
                          className="flex items-center gap-1 font-medium text-[var(--color-text-secondary)] hover:underline"
                          title="Configure exactly what this manager can see and do"
                        >
                          <ShieldCheck size={13} /> Access
                        </button>
                      )}
                      {canDeleteTarget(u) && (
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="flex items-center gap-1 font-medium text-[var(--color-danger)] hover:underline"
                          title="Permanently delete this user"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
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
      <DeleteUserDialog user={deletingUser} onClose={() => setDeletingUser(null)} onDeleted={refresh} />
    </div>
  );
}
