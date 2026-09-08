import api from "./api";

const callService = {
  // Declares a manual dial before the SIP INVITE so the call row carries the
  // agent and campaign. Only the destination is sent: agent comes from the
  // token and campaign from the agent's active session, so neither can be
  // spoofed by the client.
  manual: (toNumber) => api.post("/calls/manual", { to_number: toNumber }).then((r) => r.data),

  hangup: (callId) => api.post(`/calls/${callId}/hangup`).then((r) => r.data),
  sendDtmf: (callId, digits, opts = {}) =>
    api.post(`/calls/${callId}/dtmf`, { digits, ...opts }).then((r) => r.data),
  // Closes out a call for real: writes calls.disposition, updates the
  // lead's status/last_disposition, and — for a Do Not Call disposition —
  // adds the number to the shared DNC list. Works for both a dialer call
  // and a manual dial; either way callId is the row POST /calls/manual or
  // the dialer already created.
  disposition: (callId, disposition, notes) =>
    api.post(`/calls/${callId}/disposition`, { disposition, notes }).then((r) => r.data),
};

export default callService;
