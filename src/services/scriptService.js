import api from "./api";

const scriptService = {
  list: () => api.get("/scripts").then((r) => r.data),
  get: (id) => api.get(`/scripts/${id}`).then((r) => r.data),
  create: (payload) => api.post("/scripts", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/scripts/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/scripts/${id}`).then((r) => r.data),
  assignToCampaign: (scriptId, campaignId) => api.post(`/scripts/${scriptId}/assign/${campaignId}`).then((r) => r.data),
  getForCampaign: (campaignId) => api.get(`/scripts/campaign/${campaignId}`).then((r) => r.data),
};

export default scriptService;
