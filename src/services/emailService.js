import api from "./api";

// Every email call goes through the authenticated server. The Telnyx API
// key never reaches the browser — rendering, sending and tracking all
// happen server-side.
const emailService = {
  // ---- Templates ----
  listTemplates: (params) => api.get("/email/templates", { params }).then((r) => r.data),
  getTemplate: (id) => api.get(`/email/templates/${id}`).then((r) => r.data),
  variables: () => api.get("/email/templates/variables").then((r) => r.data),
  previewTemplate: (payload) => api.post("/email/templates/preview", payload).then((r) => r.data),
  createTemplate: (payload) => api.post("/email/templates", payload).then((r) => r.data),
  updateTemplate: (id, payload) => api.patch(`/email/templates/${id}`, payload).then((r) => r.data),
  duplicateTemplate: (id) => api.post(`/email/templates/${id}/duplicate`).then((r) => r.data),
  deleteTemplate: (id) => api.delete(`/email/templates/${id}`).then((r) => r.data),
  sendTest: (id, payload) => api.post(`/email/templates/${id}/test`, payload).then((r) => r.data),

  // ---- Sending (agent composer) ----
  send: (payload) => api.post("/email/send", payload).then((r) => r.data),

  // ---- Activity + analytics ----
  listMessages: (params) => api.get("/email/messages", { params }).then((r) => r.data),
  filterOptions: () => api.get("/email/messages/filter-options").then((r) => r.data),
  getMessage: (id) => api.get(`/email/messages/${id}`).then((r) => r.data),
  listForLead: (leadId) => api.get(`/email/lead/${leadId}`).then((r) => r.data),
  analytics: (params) => api.get("/email/analytics", { params }).then((r) => r.data),

  // ---- Suppression list ----
  listSuppressions: (params) => api.get("/email/suppressions", { params }).then((r) => r.data),
  addSuppression: (email) => api.post("/email/suppressions", { email }).then((r) => r.data),
  removeSuppression: (id) => api.delete(`/email/suppressions/${id}`).then((r) => r.data),
};

export default emailService;
