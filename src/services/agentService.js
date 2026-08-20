import api from "./api";

const agentService = {
  changeStatus: (status) => api.post("/agent/status", { status }).then((r) => r.data),
  getSessionSummary: (sessionId) => api.get(`/agent/session/${sessionId}/summary`).then((r) => r.data),
  getSipToken: () => api.get("/agent/sip-token").then((r) => r.data),
  createSipCredential: (userId) => api.post(`/admin/agents/${userId}/sip-credential`).then((r) => r.data),
  removeSipCredential: (userId) => api.delete(`/admin/agents/${userId}/sip-credential`).then((r) => r.data),
  getActiveSessions: () => api.get("/agent/sessions/active").then((r) => r.data),
};

export default agentService;
