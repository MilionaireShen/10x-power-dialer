import api from "./api";

const leadService = {
  list: (params) => api.get("/leads", { params }).then((r) => r.data),
  listLists: () => api.get("/leads/lists").then((r) => r.data),
  upload: (payload) => api.post("/leads/upload", payload).then((r) => r.data),
  // Assign a lead list to a campaign (campaignId), or unassign it (null).
  // The one call both Lead Setup and Campaign Edit use, so they stay in sync.
  assignList: (id, campaignId) =>
    api.patch(`/leads/lists/${id}`, { campaign_id: campaignId || null }).then((r) => r.data),
  deleteList: (id) => api.delete(`/leads/lists/${id}`).then((r) => r.data),
  // Manual Dialer: find an existing lead by the number the agent typed.
  // Normalises the input server-side and never creates a lead — returns
  // { data: { lead: null, normalized } } cleanly when there is no match.
  lookupByPhone: (phone) =>
    api.get("/admin/leads/lookup", { params: { phone } }).then((r) => r.data),
  // Customer Information panel autosave. `patch` is keyed by real lead
  // column names; `custom_fields` (if present) is merged server-side, not
  // replaced. An agent may only patch a lead they are currently working.
  update: (id, patch) => api.patch(`/leads/${id}`, patch).then((r) => r.data),
};

export default leadService;
