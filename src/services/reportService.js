import api from "./api";

// Triggers a real browser download of a CSV report using the same
// endpoint + params as the JSON version, just with format=csv.
async function downloadCsv(path, params, filename) {
  const res = await api.get(path, { params: { ...params, format: "csv" }, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

const reportService = {
  agentPerformance: (params) => api.get("/reports/agent-performance", { params }).then((r) => r.data),
  campaignPerformance: (params) => api.get("/reports/campaign-performance", { params }).then((r) => r.data),
  dispositionReport: (params) => api.get("/reports/disposition-report", { params }).then((r) => r.data),
  callbackReport: (params) => api.get("/reports/callback-report", { params }).then((r) => r.data),
  agentTime: (userId, params) => api.get(`/reports/agent-time/${userId}`, { params }).then((r) => r.data),
  agentProductivity: (params) => api.get("/reports/agent-productivity", { params }).then((r) => r.data),
  leaderboard: (params) => api.get("/reports/leaderboard", { params }).then((r) => r.data),
  downloadCsv,
};

export default reportService;
