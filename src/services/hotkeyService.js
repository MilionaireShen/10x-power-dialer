import api from "./api";

const hotkeyService = {
  getDefault: () => api.get("/hotkeys").then((r) => r.data),
  getForCampaign: (campaignId) => api.get(`/hotkeys/campaign/${campaignId}`).then((r) => r.data),
  saveBulk: (campaignId, hotkeys) => api.post("/hotkeys/bulk", { campaign_id: campaignId, hotkeys }).then((r) => r.data),
};

export default hotkeyService;
