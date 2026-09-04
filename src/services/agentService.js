import api from "./api";

const agentService = {
  changeStatus: (status) => api.post("/agent/status", { status }).then((r) => r.data),
  // Liveness ping. The Agent Monitor only counts a session as online while
  // these keep arriving; once the tab closes and they stop, the backend
  // presence reaper marks the session stale and then ends it.
  heartbeat: () => api.post("/agent/heartbeat").then((r) => r.data),
  getSessionSummary: (sessionId) => api.get(`/agent/session/${sessionId}/summary`).then((r) => r.data),
  // The dialer call this agent is on (or being rung for) right now, with the
  // lead behind it fully hydrated. Polled while the agent is waiting so a
  // progressive-campaign call arrives with the lead already on screen.
  currentCall: () => api.get("/agent/current-call").then((r) => r.data),
  getSipToken: () => api.get("/agent/sip-token").then((r) => r.data),
  createSipCredential: (userId) => api.post(`/admin/agents/${userId}/sip-credential`).then((r) => r.data),
  removeSipCredential: (userId) => api.delete(`/admin/agents/${userId}/sip-credential`).then((r) => r.data),
  getActiveSessions: () => api.get("/agent/sessions/active").then((r) => r.data),
};

export default agentService;
