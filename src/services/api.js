import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ACCESS_TOKEN_KEY = "10x-power-dialer:access_token";
const REFRESH_TOKEN_KEY = "10x-power-dialer:refresh_token";
const USER_KEY = "10x-power-dialer:user";
const SESSION_ID_KEY = "10x-power-dialer:session_id";
const LOGOUT_REASON_KEY = "logout_reason";

// 45s: dialer endpoints (preview/next, preview/dial) do a chain of
// DB round trips to Railway's Supabase and can legitimately take 10-20s
// under load. A shorter ceiling surfaces slow-but-successful calls to the
// agent as "Could not reach the server", which reads as an outage.
export const api = axios.create({ baseURL: BASE_URL, timeout: 45000 });

// Attach the JWT to every outgoing request.
api.interceptors.request.use(async (config) => {
  // Proactive refresh: if the stored token is within 30 minutes of
  // expiring, renew it before this request goes out at all, rather than
  // waiting for a 401 to trigger the reactive refresh in the response
  // interceptor below. Skipped for the auth endpoints themselves so this
  // can't recurse into refreshing while calling /auth/refresh-token.
  if (!config.url?.includes("/auth/")) {
    await ensureFreshToken();
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (import.meta.env.DEV) {
    console.log(`[api] -> ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// A single in-flight refresh shared by every request that hits a 401 at
// the same time, so a burst of parallel calls doesn't each try to refresh
// (and each fail) independently.
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("No refresh token available.");
  const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refresh_token: refreshToken });
  const newToken = res.data?.data?.access_token;
  if (!newToken) throw new Error("Refresh did not return a token.");
  localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
  return newToken;
}

function clearSessionAndRedirect(reason) {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Already on a login page: a stray 401 here (e.g. shared data loading before
  // the user signs in) must not hard-navigate — that reloads the app and, if
  // the same request fires on mount, loops forever.
  const path = window.location.pathname;
  if (path === "/agent/login" || path === "/admin/login" || path === "/superadmin/login") return;
  if (reason) localStorage.setItem(LOGOUT_REASON_KEY, reason);
  const wasAgent = path.startsWith("/agent");
  window.location.href = wasAgent ? "/agent/login" : "/admin/login";
}

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[api] <- ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    if (import.meta.env.DEV) {
      console.log(`[api] <- ${error.response?.status ?? "network error"} ${error.config?.url}`, error.response?.data?.message);
    }

    // Network-level failure (no response at all) — surface a consistent
    // shape so callers don't need to special-case axios's own error object.
    if (!error.response) {
      return Promise.reject({ networkError: true, message: "Could not reach the server. Check your connection and try again." });
    }

    const original = error.config;
    if (error.response.status === 401 && !original._retried && !original.url?.includes("/auth/")) {
      original._retried = true;
      try {
        if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearSessionAndRedirect("session_expired");
        return Promise.reject({ message: "Session expired. Please log in again." });
      }
    }

    // A 401 from an /auth/ endpoint is NOT an expired session — it is the
    // endpoint's own verdict, e.g. POST /auth/login rejecting a bad
    // password. Redirecting here wiped the tokens, stamped
    // logout_reason=session_expired, and hard-navigated back to the login
    // page, which replaced the real "Invalid email or password." with a
    // misleading "Your session expired." banner and cleared the form
    // before the login screen could ever render the actual error.
    //
    // Genuine expiry is already handled above: a 401 on a normal request
    // attempts a refresh, and only redirects here when that refresh fails.
    if (error.response.status === 401 && !original.url?.includes("/auth/")) {
      clearSessionAndRedirect("session_expired");
    }

    return Promise.reject(error.response.data || { message: "Something went wrong." });
  }
);

// Proactive refresh: called before dispatching any request from a
// long-lived screen so a token that's about to expire gets renewed
// ahead of time instead of waiting to be rejected first.
export async function ensureFreshToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return;
  try {
    const [, payloadB64] = token.split(".");
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    const expiresInMs = payload.exp * 1000 - Date.now();
    if (expiresInMs < 30 * 60 * 1000) {
      await refreshAccessToken();
    }
  } catch {
    // malformed token — let the next request's 401 handler deal with it
  }
}

export const tokenStorage = {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  SESSION_ID_KEY,
  LOGOUT_REASON_KEY,
  setSession({ accessToken, refreshToken, user, sessionId }) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (sessionId) localStorage.setItem(SESSION_ID_KEY, sessionId);
    else localStorage.removeItem(SESSION_ID_KEY);
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getSessionId() {
    return localStorage.getItem(SESSION_ID_KEY);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
  },
};

export default api;
