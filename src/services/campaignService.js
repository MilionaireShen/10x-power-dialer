import api from "./api";

const campaignService = {
  list: () => api.get("/campaigns").then((r) => r.data),
  get: (id) => api.get(`/campaigns/${id}`).then((r) => r.data),
  create: (payload) => api.post("/campaigns", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/campaigns/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/campaigns/${id}`).then((r) => r.data),
};

export default campaignService;
