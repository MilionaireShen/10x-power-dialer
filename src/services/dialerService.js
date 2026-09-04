import api from "./api";

// Backs the /dialer/* endpoints. The campaign dialer control UI (admin /
// manager) uses start/stop/pause/preflight; the agent dashboard polls
// status while it is waiting so it can show the real reason nothing is
// ringing yet.
const dialerService = {
  // Every reason the campaign can or cannot dial right now. No state change.
  preflight: (campaignId) =>
    api.get(`/dialer/preflight/${campaignId}`).then((r) => r.data),

  // Live dialer state for a campaign: is_running, state, blocked_reason,
  // agents_available, leads_remaining, calls_active.
  status: (campaignId) =>
    api.get(`/dialer/status/${campaignId}`).then((r) => r.data),

  start: (campaignId, mode) =>
    api
      .post("/dialer/start", { campaign_id: campaignId, ...(mode ? { mode } : {}) })
      .then((r) => r.data),

  pause: (campaignId) =>
    api.post("/dialer/pause", { campaign_id: campaignId }).then((r) => r.data),

  stop: (campaignId) =>
    api.post("/dialer/stop", { campaign_id: campaignId }).then((r) => r.data),

  // Progressive/preview: ask for this agent's next lead immediately rather
  // than waiting for the next tick.
  dialNext: (agentId, campaignId) =>
    api
      .post(`/dialer/dial-next/${agentId}`, { campaign_id: campaignId })
      .then((r) => r.data),

  queue: (campaignId) =>
    api.get(`/dialer/queue/${campaignId}`).then((r) => r.data),
};

export default dialerService;
