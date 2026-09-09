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

  // ---- Company profile ----
  // Name and timezone live on the company record, not in settings, because
  // that is where the rest of the platform reads them from.
  getCompany: () => api.get("/admin/company").then((r) => r.data),
  saveCompany: (payload) => api.put("/admin/company", payload).then((r) => r.data),
  // Super-admin only: edit any company by id from the Companies overview.
  // Updates the existing row in place — the company id never changes.
  updateCompanyById: (id, payload) => api.put(`/admin/companies/${id}`, payload).then((r) => r.data),

  // ---- Callbacks ----
  listCallbacks: (params) => api.get("/admin/callbacks", { params }).then((r) => r.data),
  dueCallbacks: () => api.get("/admin/callbacks/due").then((r) => r.data),
  createCallback: (payload) => api.post("/admin/callbacks", payload).then((r) => r.data),
  updateCallback: (id, payload) => api.patch(`/admin/callbacks/${id}`, payload).then((r) => r.data),
  deleteCallback: (id) => api.delete(`/admin/callbacks/${id}`).then((r) => r.data),

  // ---- Report exports ----
  exportCatalogue: () => api.get("/admin/exports/catalogue").then((r) => r.data),
  listExports: () => api.get("/admin/exports").then((r) => r.data),
  createExport: (payload) => api.post("/admin/exports", payload).then((r) => r.data),
  deleteExport: (id) => api.delete(`/admin/exports/${id}`).then((r) => r.data),
  // Returned as a path rather than fetched, so the browser downloads the file
  // through a normal navigation instead of buffering it in memory.
  exportDownloadUrl: (id) => `${api.defaults.baseURL}/admin/exports/${id}/download`,
  downloadExport: (id) => api.get(`/admin/exports/${id}/download`, { responseType: "blob" }).then((r) => r.data),

  // ---- Knowledge base ----
  listKnowledge: (params) => api.get("/admin/knowledge", { params }).then((r) => r.data),
  listAllKnowledge: () => api.get("/admin/knowledge/all").then((r) => r.data),
  createArticle: (payload) => api.post("/admin/knowledge", payload).then((r) => r.data),
  updateArticle: (id, payload) => api.patch(`/admin/knowledge/${id}`, payload).then((r) => r.data),
  deleteArticle: (id) => api.delete(`/admin/knowledge/${id}`).then((r) => r.data),

  // ---- Agent supervision ----
  // The caller's own session — polled by the agent screen so a supervisor's
  // status change or forced logout actually reaches them.
  mySession: () => api.get("/admin/my-session").then((r) => r.data),
  agentInbox: () => api.get("/admin/agent-messages").then((r) => r.data),
  messageAgent: (payload) => api.post("/admin/agent-messages", payload).then((r) => r.data),
  markMessageRead: (id) => api.post(`/admin/agent-messages/${id}/read`).then((r) => r.data),
  agentLogouts: (params) => api.get("/admin/agent-logouts", { params }).then((r) => r.data),
  forceAgentStatus: (agentId, status) =>
    api.post(`/admin/agent-status/${agentId}`, { status }).then((r) => r.data),
  forceLogout: (sessionId) => api.post(`/admin/sessions/${sessionId}/force-logout`).then((r) => r.data),
  forceLogoutAgent: (agentId) => api.post(`/admin/agent-logout/${agentId}`).then((r) => r.data),

  // ---- Broadcasts ----
  listBroadcasts: () => api.get("/admin/broadcasts").then((r) => r.data),
  sendBroadcast: (payload) => api.post("/admin/broadcasts", payload).then((r) => r.data),

  // ---- Clients and calendars ----
  listClients: () => api.get("/admin/clients").then((r) => r.data),
  createClient: (payload) => api.post("/admin/clients", payload).then((r) => r.data),
  updateClient: (id, payload) => api.patch(`/admin/clients/${id}`, payload).then((r) => r.data),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`).then((r) => r.data),
  testCalendarUrl: (url) => api.post("/admin/clients/test-calendar", { url }).then((r) => r.data),

  // ---- Dispositions ----
  createDisposition: (payload) => api.post("/admin/dispositions", payload).then((r) => r.data),
  updateDisposition: (id, payload) => api.patch(`/admin/dispositions/${id}`, payload).then((r) => r.data),
  deleteDisposition: (id) => api.delete(`/admin/dispositions/${id}`).then((r) => r.data),

  // ---- Customer Information / lead display fields ----
  // scope: undefined -> company default layout; a campaign id -> that
  // campaign's own layout (empty until cloned).
  listCustomFields: (scope) =>
    api.get("/admin/custom-fields", { params: scope ? { campaign_id: scope } : {} }).then((r) => r.data),
  createCustomField: (payload) => api.post("/admin/custom-fields", payload).then((r) => r.data),
  updateCustomField: (id, payload) => api.patch(`/admin/custom-fields/${id}`, payload).then((r) => r.data),
  deleteCustomField: (id) => api.delete(`/admin/custom-fields/${id}`).then((r) => r.data),
  cloneFieldsToCampaign: (campaignId) =>
    api.post("/admin/custom-fields/clone-to-campaign", { campaign_id: campaignId }).then((r) => r.data),

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

  // ---- Integration health ----
  testIntegration: (provider) => api.post("/admin/integrations/" + provider + "/test").then((r) => r.data),
  disconnectIntegration: (provider) => api.delete("/admin/integrations/" + provider).then((r) => r.data),

  // ---- Account funding ----
  fundingStatus: (params) => api.get("/admin/funding", { params }).then((r) => r.data),
  saveFundingSettings: (payload) => api.put("/admin/funding/settings", payload).then((r) => r.data),
  checkFunding: () => api.post("/admin/funding/check").then((r) => r.data),
  resumePausedCampaigns: (payload) => api.post("/admin/funding/resume-campaigns", payload || {}).then((r) => r.data),

  // ---- Phone System ----
  phoneNumbers: () => api.get("/admin/phone-system/numbers").then((r) => r.data),
  assignNumber: (didId, payload) =>
    api.post("/admin/phone-system/numbers/" + didId + "/assign", payload).then((r) => r.data),

  getRecordingSettings: () => api.get("/admin/phone-system/recording").then((r) => r.data),
  saveRecordingSettings: (payload) => api.put("/admin/phone-system/recording", payload).then((r) => r.data),
  // Asked by the agent's browser before it starts recording a call.
  shouldRecord: (params) => api.get("/admin/phone-system/should-record", { params }).then((r) => r.data),

  getVoicemailSettings: () => api.get("/admin/phone-system/voicemail").then((r) => r.data),
  saveVoicemailSettings: (payload) => api.put("/admin/phone-system/voicemail", payload).then((r) => r.data),

  didHealth: (didId, params) =>
    api.get("/admin/phone-system/dids/" + didId + "/health", { params }).then((r) => r.data),
  recalculateDidScores: () => api.post("/admin/phone-system/recalculate-scores").then((r) => r.data),
};

export default adminService;
