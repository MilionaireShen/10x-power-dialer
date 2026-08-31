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
};

export default leadService;
