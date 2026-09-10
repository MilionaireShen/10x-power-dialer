import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { ADMIN_NAV, SIDEBAR_EXTRAS } from "../lib/adminNav";
import { useAuth } from "../lib/AuthContext";
import { hasAnyPermission } from "../lib/permissions";
import Avatar from "./Avatar";

// The minimal icon-only rail — quick category jump only. All sub-navigation
// lives in the horizontal TopNav dropdowns.
export default function AdminSidebar() {
  const { user, logout } = useAuth();

  const isManager = user.role === "manager";
  const itemAllowed = (item) => {
    if (item.superAdminOnly) return user.role === "super_admin";
    if (isManager && item.anyPermission && !hasAnyPermission(user, item.anyPermission)) return false;
    return true;
  };
  const categories = ADMIN_NAV.map((cat) => ({ ...cat, items: cat.items.filter(itemAllowed) })).filter((cat) => {
    if (cat.adminOnly && isManager) return false;
    if (cat.anyPermission && isManager && !hasAnyPermission(user, cat.anyPermission)) return false;
    return cat.items.length > 0;
  });

  // Knowledge Center is admin/super_admin by default, and manager-visible
  // only once a knowledge permission is granted.
  const showKnowledgeCenter = !isManager || hasAnyPermission(user, ["can_access_knowledge_center", "can_view_knowledge_admin"]);

  return (
    <aside className="sticky top-0 flex h-screen w-[64px] shrink-0 flex-col items-center border-r border-[var(--color-border)] bg-white py-4">
      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)] text-[10px] font-bold text-white">
        10X
      </div>

      <IconLink to={SIDEBAR_EXTRAS.home.path} icon={SIDEBAR_EXTRAS.home.icon} label={SIDEBAR_EXTRAS.home.label} />

      <div className="my-2 h-px w-8 bg-[var(--color-border)]" />

      <nav className="flex flex-1 flex-col items-center gap-1">
        {categories.map((cat) => (
          <IconLink key={cat.key} to={cat.items[0].path} icon={cat.icon} label={cat.label} />
        ))}
      </nav>

      {showKnowledgeCenter && (
        <>
          <div className="my-2 h-px w-8 bg-[var(--color-border)]" />
          <IconLink to={SIDEBAR_EXTRAS.help.path} icon={SIDEBAR_EXTRAS.help.icon} label={SIDEBAR_EXTRAS.help.label} />
        </>
      )}

      <div className="mt-3">
        <Avatar name={user.name} color={user.avatarColor} size={32} />
      </div>
      <button
        onClick={logout}
        title="Log Out"
        className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-danger-tint)] hover:text-[var(--color-danger)]"
      >
        <LogOut size={16} />
      </button>
    </aside>
  );
}

function IconLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150 ${
          isActive ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
        }`
      }
    >
      <Icon size={18} />
      <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-40">
        {label}
      </span>
    </NavLink>
  );
}
