import api from "./api";

const didService = {
  list: () => api.get("/dids").then((r) => r.data),
  selectForLead: (leadId, campaignId) => api.post("/dids/select", { lead_id: leadId, campaign_id: campaignId }).then((r) => r.data),
  getCoverage: () => api.get("/dids/coverage").then((r) => r.data),
  assignState: (payload) => api.post("/dids/assign-state", payload).then((r) => r.data),
  byState: (state) => api.get(`/dids/by-state/${state}`).then((r) => r.data),
  // Buy-DID flow — the frontend never talks to Telnyx directly (that would
  // require exposing a secret API key in browser JS), so these all go
  // through our own backend, which holds the Telnyx credentials server-side.
  search: (params) => api.get("/dids/search", { params }).then((r) => r.data),
  buy: (phoneNumber) => api.post("/dids/buy", { phone_number: phoneNumber }).then((r) => r.data),
  release: (didId) => api.delete(`/dids/${didId}/release`).then((r) => r.data),
  // Reconciliation: pulls every number Telnyx actually has on file and
  // fixes up the dids table to match (inserts anything missing, corrects
  // a mismatched telnyx_number_id).
  sync: () => api.post("/dids/sync").then((r) => r.data),
  // The route is /assign — /assign-campaign was never implemented, so this
  // call had always 404`d.
  assignCampaign: (didId, payload) => api.post(`/dids/${didId}/assign`, payload).then((r) => r.data),
  deactivate: (didId) => api.post(`/dids/${didId}/deactivate`).then((r) => r.data),
};

export default didService;
