import api from "./api";

// The administrative API. Everything the admin screens show comes through
// here — there is no local store of campaigns, leads, users or statistics any
// more, so a refresh shows what the database actually holds.
const adminService = {
  // ---- Dashboard ----
  overview: (params) => api.get("/admin/overview", { params }).then((r) => r.data),
  projection: (params) => api.get("/admin/projection", { params }).then((r) => r.data),
  setTarget: (payload) => api.post("/admin/projection/target", payload).then((r) => r.data),

  // ---- Settings ----
  getSettings: () => api.get("/admin/settings").then((r) => r.data),
  saveSettings: (settings) => api.put("/admin/settings", { settings }).then((r) => r.data),

  // ---- Clients and calendars ----
  listClients: () => api.get("/admin/clients").then((r) => r.data),
  createClient: (payload) => api.post("/admin/clients", payload).then((r) => r.data),
  updateClient: (id, payload) => api.patch(`/admin/clients/${id}`, payload).then((r) => r.data),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`).then((r) => r.data),

  // ---- Dispositions ----
  createDisposition: (payload) => api.post("/admin/dispositions", payload).then((r) => r.data),
  updateDisposition: (id, payload) => api.patch(`/admin/dispositions/${id}`, payload).then((r) => r.data),
  deleteDisposition: (id) => api.delete(`/admin/dispositions/${id}`).then((r) => r.data),

  // ---- Custom lead fields ----
  listCustomFields: () => api.get("/admin/custom-fields").then((r) => r.data),
  createCustomField: (payload) => api.post("/admin/custom-fields", payload).then((r) => r.data),
  updateCustomField: (id, payload) => api.patch(`/admin/custom-fields/${id}`, payload).then((r) => r.data),
  deleteCustomField: (id) => api.delete(`/admin/custom-fields/${id}`).then((r) => r.data),

  // ---- Activity, logins, sessions ----
  activity: (params) => api.get("/admin/activity", { params }).then((r) => r.data),
  loginHistory: (params) => api.get("/admin/login-history", { params }).then((r) => r.data),
  sessions: () => api.get("/admin/sessions").then((r) => r.data),

  // ---- Calls ----
  callLogs: (params) => api.get("/admin/call-logs", { params }).then((r) => r.data),
  liveCalls: () => api.get("/admin/live-calls").then((r) => r.data),

  // ---- Permissions ----
  permissionCatalogue: () => api.get("/admin/permissions/catalogue").then((r) => r.data),
  getPermissions: (userId) => api.get(`/admin/permissions/${userId}`).then((r) => r.data),
  setPermissions: (userId, permissions) =>
    api.put(`/admin/permissions/${userId}`, { permissions }).then((r) => r.data),

  // ---- Leads ----
  listLeads: (params) => api.get("/admin/leads", { params }).then((r) => r.data),
  leadDetail: (id) => api.get(`/admin/leads/${id}`).then((r) => r.data),
  createLead: (payload) => api.post("/admin/leads", payload).then((r) => r.data),
  updateLead: (id, payload) => api.patch(`/admin/leads/${id}`, payload).then((r) => r.data),
  deleteLead: (id) => api.delete(`/admin/leads/${id}`).then((r) => r.data),
  assignLeads: (payload) => api.post("/admin/leads/assign", payload).then((r) => r.data),
  leadFilterOptions: () => api.get("/admin/leads/filter-options").then((r) => r.data),

  // ---- IVR routing ----
  listIvrRules: (params) => api.get("/admin/ivr-rules", { params }).then((r) => r.data),
  createIvrRule: (payload) => api.post("/admin/ivr-rules", payload).then((r) => r.data),
  updateIvrRule: (id, payload) => api.patch(`/admin/ivr-rules/${id}`, payload).then((r) => r.data),
  deleteIvrRule: (id) => api.delete(`/admin/ivr-rules/${id}`).then((r) => r.data),

  // ---- Custom reports ----
  listCustomReports: () => api.get("/admin/custom-reports").then((r) => r.data),
  createCustomReport: (payload) => api.post("/admin/custom-reports", payload).then((r) => r.data),
  runCustomReport: (id, params) => api.get(`/admin/custom-reports/${id}/run`, { params }).then((r) => r.data),
  deleteCustomReport: (id) => api.delete(`/admin/custom-reports/${id}`).then((r) => r.data),

  // ---- Integrations ----
  listIntegrations: () => api.get("/admin/integrations").then((r) => r.data),
  saveIntegration: (payload) => api.put("/admin/integrations", payload).then((r) => r.data),

  // ---- DID reputation scoring ----
  getReputationSettings: (params) => api.get("/admin/reputation-settings", { params }).then((r) => r.data),
  saveReputationSettings: (payload) => api.put("/admin/reputation-settings", payload).then((r) => r.data),
};

export default adminService;
