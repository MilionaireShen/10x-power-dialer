import api from "./api";

const userService = {
  list: () => api.get("/users").then((r) => r.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data),
  create: (payload) => api.post("/users", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data),
  deactivate: (id) => api.delete(`/users/${id}`).then((r) => r.data),
};

export default userService;
