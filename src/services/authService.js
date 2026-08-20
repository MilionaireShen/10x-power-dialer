import api from "./api";

const authService = {
  login: (email, password, campaignId) =>
    api.post("/auth/login", { email, password, campaign_id: campaignId || undefined }).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token, newPassword) => api.post("/auth/reset-password", { token, new_password: newPassword }).then((r) => r.data),
  refreshToken: (refreshToken) => api.post("/auth/refresh-token", { refresh_token: refreshToken }).then((r) => r.data),
};

export default authService;
