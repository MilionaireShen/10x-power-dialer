import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Trophy,
  BookOpen,
  FolderKanban,
  ListChecks,
  BarChart3,
  Building2,
  Globe,
  Users as UsersIcon,
  Contact,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { hasAnyPermission } from "../lib/permissions";
import Avatar from "./Avatar";

const NAV_BY_ROLE = {
  // Dashboard/Leaderboard open as overlay panels (styled like My Stats)
  // instead of navigating to a route — the agent never leaves the call
  // screen. Knowledge Center is admin/manager-only, never shown here.
  agent: [
    { label: "Dashboard", icon: LayoutGrid, panel: "dashboard" },
    { label: "Leaderboard", icon: Trophy, panel: "leaderboard" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
    { to: "/campaigns", label: "Campaigns", icon: FolderKanban },
    { to: "/leads", label: "Lead Lists", icon: ListChecks },
    { to: "/clients", label: "Clients", icon: Contact },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/users", label: "Users", icon: UsersIcon },
    { to: "/knowledge", label: "Knowledge Center", icon: BookOpen },
  ],
  super_admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
    { to: "/campaigns", label: "Campaigns", icon: FolderKanban },
    { to: "/leads", label: "Lead Lists", icon: ListChecks },
    { to: "/clients", label: "Clients", icon: Contact },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/companies", label: "Companies", icon: Building2 },
    { to: "/users", label: "Users", icon: UsersIcon },
    { to: "/superadmin/dashboard", label: "Global Reports", icon: Globe },
    { to: "/knowledge", label: "Knowledge Center", icon: BookOpen },
  ],
  // A manager's nav is filtered down to only the sections their permission
  // checklist actually unlocks — everything else stays invisible, not just
  // blocked.
  manager: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid, anyPermission: ["view_agent_monitor"] },
    {
      to: "/campaigns",
      label: "Campaigns",
      icon: FolderKanban,
      anyPermission: ["create_campaigns", "edit_campaigns", "pause_resume_campaigns", "change_dialing_mode", "assign_agents_campaigns"],
    },
    { to: "/leads", label: "Lead Lists", icon: ListChecks, anyPermission: ["upload_lead_lists", "manage_dnc"] },
    {
      to: "/reports",
      label: "Reports",
      icon: BarChart3,
      anyPermission: ["view_campaign_reports", "view_agent_reports", "view_conversion_reports", "view_duration_reports"],
    },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/knowledge", label: "Knowledge Center", icon: BookOpen },
  ],
};

const ROLE_LABEL = { agent: "Agent", admin: "Admin", manager: "Manager", super_admin: "Super Admin" };

const SOFTPHONE_BADGE = {
  idle: { label: "Initializing…", color: "#6B7280" },
  connecting: { label: "Connecting…", color: "#D97706" },
  registered: { label: "Registered", color: "#059669" },
  unregistered: { label: "Not Registered", color: "#6B7280" },
  disconnected: { label: "Disconnected", color: "#DC2626" },
  failed: { label: "Registration Failed", color: "#DC2626" },
};

// Persistent registration status for the WebRTC softphone — always visible
// in the agent header regardless of which call state the dashboard is in.
function SoftphoneBadge({ status, error, micBlocked, onRetry }) {
  const meta = SOFTPHONE_BADGE[status] ?? SOFTPHONE_BADGE.idle;
  const canRetry = ["failed", "disconnected", "unregistered"].includes(status) && onRetry;
  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 10%, white)` }}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="text-xs font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>
      {error && <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-tertiary)]">{error}</p>}
      {/* Registration can succeed while the mic is still blocked — without
          a mic no SDP offer can be built, so no call can ever be placed. */}
      {micBlocked && (
        <p className="mt-1 text-[11px] font-medium leading-snug text-[var(--color-danger)]">
          Microphone blocked — calls cannot be placed. Allow mic access in your browser, then reload.
        </p>
      )}
      {canRetry && (
        <button onClick={onRetry} className="mt-1.5 text-[11px] font-medium text-[var(--color-accent)] hover:underline">
          Retry Registration
        </button>
      )}
    </div>
  );
}

// Agent-only props (open/onClose/onReopen/onOpenPanel/openPanel) drive the
// collapse-to-edge-tab behavior and the Dashboard/Leaderboard overlay
// triggers. Other roles never mount this component, so their arrays above
// keep working exactly as plain route NavLinks with these props unused.
export default function Sidebar({
  open = true,
  onClose,
  onReopen,
  onOpenPanel,
  openPanel,
  softphoneStatus,
  softphoneError,
  micBlocked,
  onRetrySoftphone,
}) {
  const { user, logout } = useAuth();

  if (!user) return null;
  const items = (NAV_BY_ROLE[user.role] ?? NAV_BY_ROLE.agent).filter(
    (item) => !item.anyPermission || hasAnyPermission(user, item.anyPermission)
  );

  if (!open) {
    return (
      <button
        onClick={onReopen}
        className="fixed left-0 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 rounded-r-lg border border-l-0 border-[var(--color-border)] bg-white px-2 py-4 text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
        aria-label="Open sidebar"
      >
        <ChevronRight size={16} />
      </button>
    );
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-white transition-all duration-300 ease-out">
      <div className="flex items-center justify-between gap-2.5 border-b border-[var(--color-border)] px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)] text-xs font-bold text-white">
            10X
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Power Dialer
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {user.role === "agent" && softphoneStatus && (
        <div className="border-b border-[var(--color-border)] px-3 py-3">
          <SoftphoneBadge status={softphoneStatus} error={softphoneError} micBlocked={micBlocked} onRetry={onRetrySoftphone} />
        </div>
      )}

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          if (item.panel) {
            const active = openPanel === item.panel;
            return (
              <button
                key={item.panel}
                onClick={() => onOpenPanel?.(item.panel)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Icon size={18} strokeWidth={2} className="shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
                }`
              }
            >
              <Icon size={18} strokeWidth={2} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.name} color={user.avatarColor} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--color-text-tertiary)]">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-danger-tint)] hover:text-[var(--color-danger)]"
        >
          <LogOut size={15} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
