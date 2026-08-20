// Admins and super admins implicitly have every capability. Agents never
// reach permission-gated screens (route guards stop them earlier). Managers
// are the only role whose access is actually determined by the checklist an
// admin configured for them.
export function hasPermission(user, key) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (user.role === "manager") return Boolean(user.permissions?.[key]);
  return false;
}

export function hasAnyPermission(user, keys) {
  return keys.some((key) => hasPermission(user, key));
}
