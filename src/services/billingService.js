import api from "./api";
import reportService from "./reportService";

const billingService = {
  getBalance: () => api.get("/billing/balance").then((r) => r.data),
  getUsage: (params) => api.get("/billing/usage", { params }).then((r) => r.data),
  getTransactions: (params) => api.get("/billing/transactions", { params }).then((r) => r.data),
  getSummary: () => api.get("/billing/summary").then((r) => r.data),
  saveAlertSettings: (payload) => api.post("/billing/alerts", payload).then((r) => r.data),
  downloadTransactionsCsv: (params) => reportService.downloadCsv("/billing/transactions", params, "transactions.csv"),
};

export default billingService;
