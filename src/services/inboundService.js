import api from "./api";

const inboundService = {
  // Queue + active inbound calls in one request, so the dashboard cannot show
  // the two halves from different moments.
  live: () => api.get("/inbound/live").then((r) => r.data),
  queue: (params) => api.get("/inbound/queue", { params }).then((r) => r.data),

  // Shows who WOULD take a call for this campaign right now. Answers "why did
  // nobody pick up" before the fact rather than from logs afterwards.
  routingPreview: (campaignId) => api.get(`/inbound/campaign/${campaignId}/preview`).then((r) => r.data),

  didRouting: () => api.get("/dids/routing").then((r) => r.data),
  assignDid: (didId, payload) => api.post(`/dids/${didId}/assign`, payload).then((r) => r.data),
};

export default inboundService;
