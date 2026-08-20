import api from "./api";

const leadService = {
  list: (params) => api.get("/leads", { params }).then((r) => r.data),
  listLists: () => api.get("/leads/lists").then((r) => r.data),
  upload: (payload) => api.post("/leads/upload", payload).then((r) => r.data),
};

export default leadService;
