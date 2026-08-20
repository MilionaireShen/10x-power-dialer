import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth, DASHBOARD_PATH_BY_ROLE } from "../lib/AuthContext";

export default function AccessDenied() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-danger-tint)] text-[var(--color-danger)]">
        <ShieldAlert size={26} />
      </span>
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Access Denied</h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
        Your account doesn&rsquo;t have permission to view this section. Contact an administrator if you believe this is a mistake.
      </p>
      <button onClick={() => navigate(DASHBOARD_PATH_BY_ROLE[user?.role] ?? "/agent/login")} className="btn-purple">
        Back to Dashboard
      </button>
    </div>
  );
}
