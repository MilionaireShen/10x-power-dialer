import api from "./api";

// Live-call supervision. The backend resolves the agent's current call from
// `agent_id`, and dials `monitor_number` (the supervisor's own phone) as the
// leg it attaches to that call — so listening/whispering/barging happens on
// the supervisor's phone, not in the browser.
//
// listen/whisper/barge are the same "make my supervision of this agent's
// call be <mode>" call: the first one starts the session, any later one
// switches the mode of the session already running (no number needed to
// switch). Each returns { data: { monitoring_id, ... } }.
const monitorService = {
  listen: (agentId, monitorNumber) =>
    api.post("/monitor/listen", { agent_id: agentId, monitor_number: monitorNumber }).then((r) => r.data),
  whisper: (agentId, monitorNumber) =>
    api.post("/monitor/whisper", { agent_id: agentId, monitor_number: monitorNumber }).then((r) => r.data),
  barge: (agentId, monitorNumber) =>
    api.post("/monitor/barge", { agent_id: agentId, monitor_number: monitorNumber }).then((r) => r.data),
  // Stop by the monitoring_id the start returned, or by agent_id (the
  // supervisor's open session for that agent) when the id wasn't kept.
  stop: ({ monitoringId, agentId } = {}) =>
    api.post("/monitor/stop", { monitoring_id: monitoringId, agent_id: agentId }).then((r) => r.data),
};

export default monitorService;
