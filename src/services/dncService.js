import api from "./api";

const dncService = {
  list: () => api.get("/dnc").then((r) => r.data),
  add: (phoneNumber, reason) => api.post("/dnc", { phone_number: phoneNumber, reason }).then((r) => r.data),
  bulkAdd: (phoneNumbers) => api.post("/dnc/bulk", { phone_numbers: phoneNumbers }).then((r) => r.data),
  remove: (id) => api.delete(`/dnc/${id}`).then((r) => r.data),
  updateSettings: (autoScrub) => api.put("/dnc/settings", { auto_scrub: autoScrub }).then((r) => r.data),
};

export default dncService;
