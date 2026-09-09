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
  // The admin-configured Customer Information field layout for a campaign:
  // which lead fields the agent screen shows, their labels and their order.
  leadFields: (campaignId) =>
    api.get("/agent/lead-fields", { params: campaignId ? { campaign_id: campaignId } : {} }).then((r) => r.data),
  createSipCredential: (userId) => api.post(`/admin/agents/${userId}/sip-credential`).then((r) => r.data),
  removeSipCredential: (userId) => api.delete(`/admin/agents/${userId}/sip-credential`).then((r) => r.data),
  getActiveSessions: () => api.get("/agent/sessions/active").then((r) => r.data),
  // This agent's Parallel Dials setting, the company's ceiling, and
  // whether parallel dialing is on at all. Persisted server-side, so it
  // survives a refresh or a fresh login.
  getParallelDials: () => api.get("/agent/parallel-dials").then((r) => r.data),
  setParallelDials: (n) => api.post("/agent/parallel-dials", { parallel_dials: n }).then((r) => r.data),
  // How many of this agent's current parallel batch are still actively
  // ringing/dialing right now — the live count behind the "N active dials"
  // indicator. active_calls reflects real open call rows, never the
  // configured maximum.
  getParallelStatus: () => api.get("/agent/parallel-status").then((r) => r.data),
};

export default agentService;
