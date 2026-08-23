import api from "./api";

const userService = {
  // Accepts filters so a caller can ask for just agents rather than pulling
  // every user into the browser and filtering there.
  list: (params) => api.get("/users", { params }).then((r) => r.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data),
  create: (payload) => api.post("/users", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data),
  deactivate: (id) => api.delete(`/users/${id}`).then((r) => r.data),
};

export default userService;
