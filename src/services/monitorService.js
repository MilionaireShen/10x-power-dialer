import api from "./api";

const monitorService = {
  listen: (agentId) => api.post("/monitor/listen", { agent_id: agentId }).then((r) => r.data),
  whisper: (agentId) => api.post("/monitor/whisper", { agent_id: agentId }).then((r) => r.data),
  barge: (agentId) => api.post("/monitor/barge", { agent_id: agentId }).then((r) => r.data),
  stop: (agentId) => api.post("/monitor/stop", { agent_id: agentId }).then((r) => r.data),
};

export default monitorService;
