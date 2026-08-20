import { createContext, useContext, useEffect, useMemo, useState } from "react";
import authService from "../services/authService";
import { tokenStorage } from "../services/api";

const AuthContext = createContext(null);
const CAMPAIGN_KEY = "10x-power-dialer:campaign";

const AVATAR_COLOR_BY_ROLE = {
  agent: "#5B3FE0",
  admin: "#334155",
  manager: "#0F766E",
  super_admin: "#4830B8",
};

// Each login page is role-specific by URL (/agent/login, /admin/login,
// /superadmin/login) so the role is known up front. Managers sign in
// through the admin login page (no separate manager URL in the spec) and
// land on the same shared dashboard shell, just with a permission-filtered
// nav.
export const DASHBOARD_PATH_BY_ROLE = {
  agent: "/agent/dashboard",
  admin: "/admin/dashboard",
  manager: "/admin/dashboard",
  super_admin: "/admin/dashboard",
};

export const LOGIN_PATH_BY_ROLE = {
  agent: "/agent/login",
  admin: "/admin/login",
  manager: "/admin/login",
  super_admin: "/superadmin/login",
};

// The rest of the UI (Sidebar, AdminSidebar, AgentDashboard, etc.) only
// ever reads user.id/name/email/role/avatarColor/permissions — this
// shapes both the /auth/login and /auth/me API responses into that same
// object regardless of which one produced it.
function normalizeUser(raw, { name } = {}) {
  return {
    id: raw.id,
    name: name ?? raw.name ?? `${raw.first_name ?? ""} ${raw.last_name ?? ""}`.trim(),
    email: raw.email,
    role: raw.role,
    companyId: raw.company_id,
    permissions: raw.permissions ?? {},
    avatarColor: AVATAR_COLOR_BY_ROLE[raw.role] ?? "#334155",
    status: "available",
    statusSince: Date.now(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(() => localStorage.getItem(CAMPAIGN_KEY) || null);
  const [sessionId, setSessionId] = useState(() => tokenStorage.getSessionId());
  const [initializing, setInitializing] = useState(true);

  // On mount (or hard refresh), a stored access token is verified against
  // /auth/me rather than trusted as-is — it may have expired or been
  // revoked server-side since it was saved.
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    authService
      .me()
      .then((res) => {
        setUser(normalizeUser(res.data));
      })
      .catch(() => {
        tokenStorage.clear();
        localStorage.removeItem(CAMPAIGN_KEY);
      })
      .finally(() => setInitializing(false));
  }, []);

  // Returns { success, message, data } instead of throwing, so login
  // screens can render the backend's actual error (or, for an agent
  // missing campaign_id, the assigned_campaigns list the backend hands
  // back) rather than a generic failure.
  const login = async (email, password, campaignId = null) => {
    let res;
    try {
      res = await authService.login(email, password, campaignId);
    } catch (err) {
      return { success: false, message: err?.message || "Login failed.", data: err?.data || null };
    }

    const { access_token, refresh_token, user: apiUser, session_id } = res.data;
    const normalized = normalizeUser(apiUser);

    tokenStorage.setSession({ accessToken: access_token, refreshToken: refresh_token, user: normalized, sessionId: session_id });
    if (campaignId) {
      localStorage.setItem(CAMPAIGN_KEY, campaignId);
    } else {
      localStorage.removeItem(CAMPAIGN_KEY);
    }

    setActiveCampaignId(campaignId || null);
    setSessionId(session_id || null);
    setUser(normalized);

    return { success: true };
  };

  const logout = async () => {
    const hadToken = Boolean(tokenStorage.getAccessToken());
    tokenStorage.clear();
    localStorage.removeItem(CAMPAIGN_KEY);
    setActiveCampaignId(null);
    setSessionId(null);
    setUser(null);
    if (hadToken) {
      // Best-effort — the user is logged out client-side either way.
      await authService.logout().catch(() => {});
    }
  };

  const value = useMemo(
    () => ({ user, activeCampaignId, sessionId, initializing, login, logout }),
    [user, activeCampaignId, sessionId, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
