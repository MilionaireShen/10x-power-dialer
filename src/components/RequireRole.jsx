import { Navigate } from "react-router-dom";
import { useAuth, DASHBOARD_PATH_BY_ROLE } from "../lib/AuthContext";
import { hasAnyPermission } from "../lib/permissions";

// Route guard enforcing the strict per-role visibility rules — an
// unauthenticated visitor is sent to the login for the section they tried to
// reach, and a wrong-role user is bounced to their own dashboard rather than
// being allowed to see a screen that isn't theirs. When `anyPermission` is
// given, a manager additionally needs at least one of those permission keys
// (admins/super admins always pass) or they land on Access Denied instead.
export default function RequireRole({ roles, loginPath, anyPermission, children }) {
  const { user, initializing } = useAuth();

  // Still verifying a stored token against /auth/me — don't redirect yet,
  // that would bounce a genuinely logged-in user on every hard refresh.
  if (initializing) return null;

  if (!user) return <Navigate to={loginPath} replace />;
  if (!roles.includes(user.role)) return <Navigate to={DASHBOARD_PATH_BY_ROLE[user.role]} replace />;
  if (anyPermission && user.role === "manager" && !hasAnyPermission(user, anyPermission)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}
