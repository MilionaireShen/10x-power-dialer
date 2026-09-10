import api from "./api";

const userService = {
  // Accepts filters so a caller can ask for just agents rather than pulling
  // every user into the browser and filtering there.
  list: (params) => api.get("/users", { params }).then((r) => r.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data),
  create: (payload) => api.post("/users", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data),
  // Reversible — sets status='inactive', keeps the row and every related record.
  deactivate: (id) => api.delete(`/users/${id}`).then((r) => r.data),
  // Permanent — removes the account itself. Requires the admin to have
  // typed DELETE (passed through as `confirm`).
  remove: (id, confirm) => api.delete(`/users/${id}/permanent`, { data: { confirm } }).then((r) => r.data),
};

export default userService;
