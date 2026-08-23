import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  CAMPAIGNS,
  DEFAULT_CUSTOM_FIELDS,
  SEED_CALLBACKS,
  CLIENTS,
  DISPOSITIONS,
  PHONE_NUMBERS,
  IVR_RULES,
  INTEGRATIONS,
  DEFAULT_ADMIN_SETTINGS,
  DEFAULT_MANAGER_PERMISSIONS,
  SEED_AGENT_LOGOUTS,
} from "../data/mockData";
import {
  DEFAULT_DID_SETTINGS,
  resolveDidSettings,
  calculateDIDScore,
  getDIDHealth as engineGetDIDHealth,
  getEligibleDIDs as engineGetEligibleDIDs,
  selectBestDID as engineSelectBestDID,
  getDIDTrend as engineGetDIDTrend,
  applyCallOutcome,
  applyDIDEvent,
  checkCoolingTriggers,
  pauseDID as enginePauseDID,
  beginCooling as engineBeginCooling,
  resumeDID as engineResumeDID,
} from "./didReputationEngine";

// App-wide mutable demo state (campaigns, custom lead fields, callbacks,
// monitoring, admin activity, and the rest of the restructured admin
// sections) lifted above the router so admin actions are reflected instantly
// on the agent screens within the same browser session — no backend, just
// shared React state.
const AppDataContext = createContext(null);

let idCounter = 0;
const nextId = (prefix) => `${prefix}-${Date.now()}-${++idCounter}`;

export function AppDataProvider({ children }) {
  const [campaigns, setCampaigns] = useState(CAMPAIGNS);
  const [customFields, setCustomFields] = useState(DEFAULT_CUSTOM_FIELDS);
  const [callbacks, setCallbacks] = useState(SEED_CALLBACKS);
  // Users come from the API on the screens that need them; the context no
  // longer keeps a roster of its own.
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState(CLIENTS);
  const [dispositions, setDispositions] = useState(DISPOSITIONS);
  // Scripts are read from the API by the screens that show them.
  const [scripts, setScripts] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState(PHONE_NUMBERS);
  const [ivrRules, setIvrRules] = useState(IVR_RULES);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [adminSettings, setAdminSettings] = useState(DEFAULT_ADMIN_SETTINGS);
  const [managerPermissionTemplate, setManagerPermissionTemplate] = useState(DEFAULT_MANAGER_PERMISSIONS);
  const [customReports, setCustomReports] = useState([]);
  const [manualDialLog, setManualDialLog] = useState([]);
  const [didSettings, setDidSettings] = useState(DEFAULT_DID_SETTINGS);
  const [campaignDidOverrides, setCampaignDidOverrides] = useState({});
  const [didAlerts, setDidAlerts] = useState([]);
  const [agentLogoutLog, setAgentLogoutLog] = useState(SEED_AGENT_LOGOUTS);
  const [activityLog, setActivityLog] = useState([]);
  const [monitoringSessions, setMonitoringSessions] = useState([]);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentControl, setAgentControl] = useState({
    forcedFor: null,
    forcedStatus: null,
    forcedAt: null,
    forceLogoutFor: null,
    forceLogoutAt: null,
  });

  const updateCampaign = useCallback((id, patch) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const addCampaign = useCallback((campaign) => {
    setCampaigns((prev) => [campaign, ...prev]);
  }, []);

  const logActivity = useCallback((entry) => {
    setActivityLog((prev) => [{ id: nextId("log"), timestamp: Date.now(), ...entry }, ...prev]);
  }, []);

  const addCallback = useCallback((cb) => {
    const record = { id: nextId("cb"), status: "Pending", ...cb };
    setCallbacks((prev) => [record, ...prev]);
    return record;
  }, []);

  const updateCallbackStatus = useCallback((id, status, extra = {}) => {
    setCallbacks((prev) => prev.map((c) => (c.id === id ? { ...c, status, ...extra } : c)));
  }, []);

  const startMonitoring = useCallback(
    (admin, agentName, type, agentId) => {
      const session = { id: nextId("mon"), admin, agentName, agentId, type, startedAt: Date.now() };
      setMonitoringSessions((prev) => [...prev, session]);
      logActivity({ admin, action: `Started ${type}`, targetAgent: agentName, details: `${type} session started` });
      return session.id;
    },
    [logActivity]
  );

  // Switches an in-progress monitoring session between listen/whisper/barge
  // without resetting its startedAt — the floating bar's elapsed timer keeps
  // counting continuously across a mode switch, matching one real session.
  const switchMonitoringMode = useCallback((id, type) => {
    setMonitoringSessions((prev) => prev.map((s) => (s.id === id ? { ...s, type } : s)));
  }, []);

  const stopMonitoring = useCallback(
    (id) => {
      setMonitoringSessions((prev) => {
        const session = prev.find((s) => s.id === id);
        if (session) {
          logActivity({
            admin: session.admin,
            action: `Stopped ${session.type}`,
            targetAgent: session.agentName,
            details: `${session.type} session ended after ${Math.max(1, Math.round((Date.now() - session.startedAt) / 1000))}s`,
          });
        }
        return prev.filter((s) => s.id !== id);
      });
    },
    [logActivity]
  );

  const sendAgentMessage = useCallback(
    (admin, agentName, text) => {
      setAgentMessages((prev) => [...prev, { id: nextId("msg"), agentName, from: admin, text, timestamp: Date.now() }]);
      logActivity({ admin, action: "Sent Message", targetAgent: agentName, details: text });
    },
    [logActivity]
  );

  const consumeAgentMessage = useCallback((id) => {
    setAgentMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const forceAgentStatus = useCallback(
    (admin, agentName, status) => {
      setAgentControl((prev) => ({ ...prev, forcedFor: agentName, forcedStatus: status, forcedAt: Date.now() }));
      logActivity({ admin, action: "Force Status Change", targetAgent: agentName, details: `Changed status to "${status}"` });
    },
    [logActivity]
  );

  const forceAgentLogout = useCallback(
    (admin, agentName) => {
      setAgentControl((prev) => ({ ...prev, forceLogoutFor: agentName, forceLogoutAt: Date.now() }));
      setAgentLogoutLog((prev) => [{ id: nextId("alog"), agentName, reason: "admin_kick", timestamp: Date.now() }, ...prev]);
      logActivity({ admin, action: "Force Logout", targetAgent: agentName, details: "Agent immediately logged out" });
    },
    [logActivity]
  );

  const recordAgentLogout = useCallback((agentName, reason) => {
    setAgentLogoutLog((prev) => [{ id: nextId("alog"), agentName, reason, timestamp: Date.now() }, ...prev]);
  }, []);

  const addUser = useCallback(
    (admin, user) => {
      const record = { id: nextId("user"), status: "Active", lastLogin: null, campaigns: [], ...user };
      setUsers((prev) => [record, ...prev]);
      logActivity({ admin, action: "Created User", targetAgent: `${record.firstName} ${record.lastName}`, details: `Role: ${record.role}` });
      return record;
    },
    [logActivity]
  );

  const updateUser = useCallback(
    (admin, id, patch, changeSummary) => {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      const target = users.find((u) => u.id === id);
      logActivity({
        admin,
        action: "Updated User",
        targetAgent: target ? `${target.firstName} ${target.lastName}` : id,
        details: changeSummary || "Profile updated",
      });
    },
    [logActivity, users]
  );

  const setUserStatus = useCallback(
    (admin, id, status) => {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
      const target = users.find((u) => u.id === id);
      logActivity({
        admin,
        action: status === "Active" ? "Reactivated User" : "Deactivated User",
        targetAgent: target ? `${target.firstName} ${target.lastName}` : id,
        details: `Account set to ${status}`,
      });
    },
    [logActivity, users]
  );

  // Strips a campaign out of every other client's list before it's assigned
  // elsewhere, so one campaign's leads can never resolve to two different
  // calendars at once.
  const claimCampaigns = useCallback((prevClients, campaignIds, exceptClientId) => {
    return prevClients.map((c) =>
      c.id === exceptClientId ? c : { ...c, campaignIds: c.campaignIds.filter((id) => !campaignIds.includes(id)) }
    );
  }, []);

  const addClient = useCallback(
    (admin, client) => {
      const record = { id: nextId("client"), calendarEnabled: false, calendarUrl: "", campaignIds: [], ...client };
      setClients((prev) => [record, ...claimCampaigns(prev, record.campaignIds, null)]);
      logActivity({ admin, action: "Created Client", targetAgent: record.name, details: `Calendar: ${record.calendarProvider || "none"}` });
      return record;
    },
    [logActivity, claimCampaigns]
  );

  const updateClient = useCallback(
    (admin, id, patch) => {
      setClients((prev) => {
        const withClaim = patch.campaignIds ? claimCampaigns(prev, patch.campaignIds, id) : prev;
        return withClaim.map((c) => (c.id === id ? { ...c, ...patch } : c));
      });
      logActivity({ admin, action: "Updated Client Calendar", targetAgent: clients.find((c) => c.id === id)?.name ?? id, details: "Calendar configuration changed" });
    },
    [logActivity, claimCampaigns, clients]
  );

  const addScript = useCallback((script) => {
    setScripts((prev) => [{ id: nextId("script"), ...script }, ...prev]);
  }, []);

  const updateScript = useCallback((id, patch) => {
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addPhoneNumber = useCallback((num) => {
    setPhoneNumbers((prev) => [{ id: nextId("num"), status: "Active", campaignId: null, recordingEnabled: true, spamFlag: false, ...num }, ...prev]);
  }, []);

  const updatePhoneNumber = useCallback((id, patch) => {
    setPhoneNumbers((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const addIvrRule = useCallback((rule) => {
    setIvrRules((prev) => [...prev, { id: nextId("ivr"), ...rule }]);
  }, []);

  const removeIvrRule = useCallback((id) => {
    setIvrRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Config is saved regardless of connect state (matches real integrations —
  // disconnecting doesn't wipe what you'd already filled in), only the
  // `connected` flag flips.
  const connectIntegration = useCallback((admin, id, config) => {
    let record = null;
    setIntegrations((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        record = { ...i, connected: true, config: { ...i.config, ...config } };
        return record;
      })
    );
    logActivity({ admin, action: "Connected Integration", targetAgent: record?.name ?? id, details: "Integration connected" });
  }, [logActivity]);

  const disconnectIntegration = useCallback(
    (admin, id) => {
      const target = integrations.find((i) => i.id === id);
      setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, connected: false } : i)));
      logActivity({ admin, action: "Disconnected Integration", targetAgent: target?.name ?? id, details: "Integration disconnected" });
    },
    [integrations, logActivity]
  );

  const updateAdminSettings = useCallback((section, patch) => {
    setAdminSettings((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }, []);

  const updateManagerPermissionTemplate = useCallback((patch) => {
    setManagerPermissionTemplate((prev) => ({ ...prev, ...patch }));
  }, []);

  const addCustomReport = useCallback((report) => {
    setCustomReports((prev) => [{ id: nextId("report"), createdAt: Date.now(), ...report }, ...prev]);
  }, []);

  const logManualDialCall = useCallback((entry) => {
    setManualDialLog((prev) => [{ id: nextId("mdial"), tag: "Manual Dial", loggedAt: Date.now(), ...entry }, ...prev]);
  }, []);

  // ---------------------------------------------------------------------
  // DID Reputation Engine — the dialer and admin screens only ever reach
  // the engine (src/lib/didReputationEngine.js) through these wrappers.
  // Global settings apply everywhere; a campaign override wins per-section
  // only when explicitly enabled (resolveDidSettings handles the merge).
  // ---------------------------------------------------------------------
  const resolveDidSettingsForCampaign = useCallback(
    (campaignId) => resolveDidSettings(didSettings, campaignId ? campaignDidOverrides[campaignId] : null),
    [didSettings, campaignDidOverrides]
  );

  const pushDidAlert = useCallback((alert) => {
    setDidAlerts((prev) => {
      const activeDup = prev.find((a) => a.didId === alert.didId && a.type === alert.type && !a.dismissed);
      if (activeDup) return prev;
      return [{ id: nextId("didalert"), timestamp: Date.now(), dismissed: false, ...alert }, ...prev];
    });
  }, []);

  const dismissDidAlert = useCallback((alertId) => {
    setDidAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, dismissed: true } : a)));
  }, []);

  const getDIDHealth = useCallback(
    (didId) => {
      const did = phoneNumbers.find((d) => d.id === didId);
      return did ? engineGetDIDHealth(did, resolveDidSettingsForCampaign(did.campaignId)) : null;
    },
    [phoneNumbers, resolveDidSettingsForCampaign]
  );

  const calculateDIDScoreById = useCallback(
    (didId, weightsOverride) => {
      const did = phoneNumbers.find((d) => d.id === didId);
      if (!did) return 0;
      return calculateDIDScore(did, weightsOverride || resolveDidSettingsForCampaign(did.campaignId).weights);
    },
    [phoneNumbers, resolveDidSettingsForCampaign]
  );

  const getEligibleDIDs = useCallback(
    (campaignId, leadAreaCode) => engineGetEligibleDIDs(phoneNumbers, campaignId, leadAreaCode, resolveDidSettingsForCampaign(campaignId)),
    [phoneNumbers, resolveDidSettingsForCampaign]
  );

  const selectBestDID = useCallback(
    (campaignId, leadAreaCode) => engineSelectBestDID(phoneNumbers, campaignId, leadAreaCode, resolveDidSettingsForCampaign(campaignId)),
    [phoneNumbers, resolveDidSettingsForCampaign]
  );

  const getDIDTrend = useCallback(
    (didId, period) => {
      const did = phoneNumbers.find((d) => d.id === didId);
      return did ? engineGetDIDTrend(did, period, resolveDidSettingsForCampaign(did.campaignId)) : null;
    },
    [phoneNumbers, resolveDidSettingsForCampaign]
  );

  const markDIDInUse = useCallback((didId) => {
    setPhoneNumbers((prev) => prev.map((d) => (d.id === didId ? { ...d, lastUsedAt: Date.now() } : d)));
  }, []);

  // Called after every call ends — updates metrics, recalculates score, and
  // auto-triggers cooling/pause + alerts exactly like a real dialer would.
  const recordCallOutcome = useCallback(
    (didId, outcome) => {
      const did = phoneNumbers.find((d) => d.id === didId);
      if (!did) return;
      const settings = resolveDidSettingsForCampaign(did.campaignId);
      let updated = applyCallOutcome(did, outcome);
      const newScore = calculateDIDScore(updated, settings.weights);
      updated = {
        ...updated,
        history: [
          ...(updated.history ?? []),
          {
            timestamp: Date.now(),
            score: newScore,
            callsToday: updated.metrics.callsToday,
            answerRate: updated.metrics.answerRate,
            shortCallPct: updated.metrics.shortCallPct,
            dncRequests: updated.metrics.dncRequests,
          },
        ],
      };

      const coolingReason = checkCoolingTriggers(updated, settings);
      if (coolingReason) {
        if (newScore < settings.thresholds.autoPause) {
          updated = enginePauseDID(updated, coolingReason, "System");
          pushDidAlert({ type: "auto_paused", didId, didNumber: updated.number, score: newScore, reason: coolingReason, campaignId: updated.campaignId });
        } else {
          updated = engineBeginCooling(updated, coolingReason, settings.cooling.coolingPeriodHours);
          pushDidAlert({ type: "cooling", didId, didNumber: updated.number, score: newScore, reason: coolingReason, campaignId: updated.campaignId });
        }
      } else if (newScore < settings.thresholds.critical) {
        pushDidAlert({
          type: "critical",
          didId,
          didNumber: updated.number,
          score: newScore,
          reason: `Score dropped to ${newScore} (Critical)`,
          campaignId: updated.campaignId,
        });
      }

      setPhoneNumbers((prev) => prev.map((d) => (d.id === didId ? updated : d)));
    },
    [phoneNumbers, resolveDidSettingsForCampaign, pushDidAlert]
  );

  const recordDIDEvent = useCallback((didId, eventType, detail) => {
    setPhoneNumbers((prev) => prev.map((d) => (d.id === didId ? applyDIDEvent(d, eventType, detail) : d)));
  }, []);

  const pauseDID = useCallback(
    (admin, didId, reason, campaignId) => {
      const did = phoneNumbers.find((d) => d.id === didId);
      if (!did) return;
      const updated = enginePauseDID(did, reason, admin);
      setPhoneNumbers((prev) => prev.map((d) => (d.id === didId ? updated : d)));
      pushDidAlert({ type: "manual_pause", didId, didNumber: did.number, score: calculateDIDScoreById(didId), reason, campaignId: campaignId ?? did.campaignId });
      logActivity({ admin, action: "Paused DID", targetAgent: did.number, details: reason });
    },
    [phoneNumbers, pushDidAlert, calculateDIDScoreById, logActivity]
  );

  const resumeDID = useCallback(
    (admin, didId) => {
      const did = phoneNumbers.find((d) => d.id === didId);
      if (!did) return;
      const updated = engineResumeDID(did, admin);
      setPhoneNumbers((prev) => prev.map((d) => (d.id === didId ? updated : d)));
      logActivity({ admin, action: "Resumed DID", targetAgent: did.number, details: "Returned to the dialing pool" });
    },
    [phoneNumbers, logActivity]
  );

  const updateDIDRegistration = useCallback(
    (admin, didId, patch) => {
      const did = phoneNumbers.find((d) => d.id === didId);
      if (!did) return;
      const updated = applyDIDEvent({ ...did, ...patch }, "registration_change", `Registration set to ${patch.registrationStatus ?? did.registrationStatus}`);
      setPhoneNumbers((prev) => prev.map((d) => (d.id === didId ? updated : d)));
      logActivity({ admin, action: "Updated DID Registration", targetAgent: did.number, details: `Registration: ${updated.registrationStatus}` });
    },
    [phoneNumbers, logActivity]
  );

  const reassignDIDCampaign = useCallback(
    (admin, didId, campaignId, campaignName) => {
      const did = phoneNumbers.find((d) => d.id === didId);
      if (!did) return;
      const closedHistory = (did.assignmentHistory ?? []).map((h) => (h.to ? h : { ...h, to: Date.now() }));
      let updated = {
        ...did,
        campaignId,
        status: campaignId ? "Active" : "Unassigned",
        assignmentHistory: [...closedHistory, { campaignName: campaignName ?? "Unassigned", from: Date.now(), to: null }],
      };
      updated = applyDIDEvent(updated, "reassigned", `Reassigned to ${campaignName ?? "Unassigned"}`);
      setPhoneNumbers((prev) => prev.map((d) => (d.id === didId ? updated : d)));
      logActivity({ admin, action: "Reassigned DID", targetAgent: did.number, details: `Now assigned to ${campaignName ?? "Unassigned"}` });
    },
    [phoneNumbers, logActivity]
  );

  const updateDidSettings = useCallback((section, patch) => {
    setDidSettings((prev) => ({
      ...prev,
      [section]: Array.isArray(patch) ? patch : { ...prev[section], ...patch },
    }));
  }, []);

  const updateCampaignDidOverride = useCallback((campaignId, section, overrideConfig) => {
    setCampaignDidOverrides((prev) => ({
      ...prev,
      [campaignId]: { ...(prev[campaignId] ?? {}), [section]: overrideConfig },
    }));
  }, []);

  const value = useMemo(
    () => ({
      campaigns,
      setCampaigns,
      updateCampaign,
      addCampaign,
      clients,
      addClient,
      updateClient,
      customFields,
      setCustomFields,
      callbacks,
      addCallback,
      updateCallbackStatus,
      users,
      addUser,
      updateUser,
      setUserStatus,
      dispositions,
      setDispositions,
      scripts,
      addScript,
      updateScript,
      phoneNumbers,
      addPhoneNumber,
      updatePhoneNumber,
      ivrRules,
      addIvrRule,
      removeIvrRule,
      integrations,
      connectIntegration,
      disconnectIntegration,
      adminSettings,
      updateAdminSettings,
      managerPermissionTemplate,
      updateManagerPermissionTemplate,
      customReports,
      addCustomReport,
      manualDialLog,
      logManualDialCall,
      didSettings,
      campaignDidOverrides,
      didAlerts,
      dismissDidAlert,
      agentLogoutLog,
      recordAgentLogout,
      resolveDidSettingsForCampaign,
      getDIDHealth,
      calculateDIDScoreById,
      getEligibleDIDs,
      selectBestDID,
      getDIDTrend,
      markDIDInUse,
      recordCallOutcome,
      recordDIDEvent,
      pauseDID,
      resumeDID,
      updateDIDRegistration,
      reassignDIDCampaign,
      updateDidSettings,
      updateCampaignDidOverride,
      activityLog,
      logActivity,
      monitoringSessions,
      startMonitoring,
      stopMonitoring,
      switchMonitoringMode,
      agentMessages,
      sendAgentMessage,
      consumeAgentMessage,
      agentControl,
      forceAgentStatus,
      forceAgentLogout,
    }),
    [
      campaigns,
      customFields,
      callbacks,
      users,
      clients,
      dispositions,
      scripts,
      phoneNumbers,
      ivrRules,
      integrations,
      adminSettings,
      managerPermissionTemplate,
      customReports,
      manualDialLog,
      didSettings,
      campaignDidOverrides,
      didAlerts,
      agentLogoutLog,
      activityLog,
      monitoringSessions,
      agentMessages,
      agentControl,
      updateCampaign,
      addCampaign,
      addClient,
      updateClient,
      addCallback,
      updateCallbackStatus,
      addUser,
      updateUser,
      setUserStatus,
      addScript,
      updateScript,
      addPhoneNumber,
      updatePhoneNumber,
      addIvrRule,
      removeIvrRule,
      connectIntegration,
      disconnectIntegration,
      updateAdminSettings,
      updateManagerPermissionTemplate,
      addCustomReport,
      logManualDialCall,
      dismissDidAlert,
      recordAgentLogout,
      resolveDidSettingsForCampaign,
      getDIDHealth,
      calculateDIDScoreById,
      getEligibleDIDs,
      selectBestDID,
      getDIDTrend,
      markDIDInUse,
      recordCallOutcome,
      recordDIDEvent,
      pauseDID,
      resumeDID,
      updateDIDRegistration,
      reassignDIDCampaign,
      updateDidSettings,
      updateCampaignDidOverride,
      logActivity,
      startMonitoring,
      stopMonitoring,
      switchMonitoringMode,
      sendAgentMessage,
      consumeAgentMessage,
      forceAgentStatus,
      forceAgentLogout,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
