import api from "./api";

// Every SMS call goes through the authenticated client. Nothing here talks to
// Telnyx: the API key lives on the server, and a browser that could send an
// SMS directly could also send one to anybody.
const smsService = {
  // ---- Conversations ----
  listConversations: (params) => api.get("/sms/conversations", { params }).then((r) => r.data),
  getConversation: (id, params) => api.get(`/sms/conversations/${id}`, { params }).then((r) => r.data),
  markRead: (id) => api.post(`/sms/conversations/${id}/read`).then((r) => r.data),

  // Returns only what has changed since `since`, so an open thread can stay
  // current without re-fetching it on a timer.
  changes: (params) => api.get("/sms/conversations/changes", { params }).then((r) => r.data),

  // ---- Sending ----
  send: (payload) => api.post("/sms/send", payload).then((r) => r.data),

  // ---- Templates ----
  listTemplates: (params) => api.get("/sms/templates", { params }).then((r) => r.data),
  variables: () => api.get("/sms/templates/variables").then((r) => r.data),
  previewTemplate: (payload) => api.post("/sms/templates/preview", payload).then((r) => r.data),
  createTemplate: (payload) => api.post("/sms/templates", payload).then((r) => r.data),
  updateTemplate: (id, payload) => api.patch(`/sms/templates/${id}`, payload).then((r) => r.data),
  duplicateTemplate: (id) => api.post(`/sms/templates/${id}/duplicate`).then((r) => r.data),

  // ---- Appointments ----
  listAppointments: (params) => api.get("/sms/appointments", { params }).then((r) => r.data),
  createAppointment: (payload) => api.post("/sms/appointments", payload).then((r) => r.data),
  confirmationPreview: (id) => api.get(`/sms/appointments/${id}/confirmation-preview`).then((r) => r.data),
  sendConfirmation: (id, payload) => api.post(`/sms/appointments/${id}/send-confirmation`, payload).then((r) => r.data),

  // ---- Reporting ----
  listMessages: (params) => api.get("/sms/messages", { params }).then((r) => r.data),
  filterOptions: () => api.get("/sms/messages/filter-options").then((r) => r.data),
  listConsent: (params) => api.get("/sms/consent", { params }).then((r) => r.data),
  recordConsent: (payload) => api.post("/sms/consent", payload).then((r) => r.data),
  audit: (params) => api.get("/sms/audit", { params }).then((r) => r.data),
};

export default smsService;
