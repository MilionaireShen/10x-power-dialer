import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DID_SETTINGS,
  resolveDidSettings,
  calculateDIDScore,
  getDIDHealth as engineGetDIDHealth,
  getEligibleDIDs as engineGetEligibleDIDs,
  selectBestDID as engineSelectBestDID,
  getDIDTrend as engineGetDIDTrend,
} from "./didReputationEngine";
import adminService from "../services/adminService";
import campaignService from "../services/campaignService";

// Shared state that genuinely belongs in the browser, plus thin loaders for
// the few things several screens need at once.
//
// This used to be the application's data layer: campaigns, clients, callbacks,
// numbers, integrations and settings were all seeded from a mock file and kept
// in React state, so every "save" lasted until the next refresh and never left
// the tab it happened in. All of that now comes from the API, and the screens
// read it themselves.
//
// What is left here is either (a) loaded once and shared because several
// screens want the same list, or (b) genuinely per-browser UI state — the
// floating monitoring bar's timer, and DID alerts raised for this admin's
// current view. Nothing here is invented.
const AppDataContext = createContext(null);

let idCounter = 0;
const nextId = (prefix) => `${prefix}-${Date.now()}-${++idCounter}`;

export function AppDataProvider({ children }) {
  // ---- Shared server data -------------------------------------------------
  const [campaigns, setCampaigns] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [didSettings, setDidSettings] = useState(DEFAULT_DID_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // ---- Per-browser UI state ----------------------------------------------
  const [monitoringSessions, setMonitoringSessions] = useState([]);
  const [didAlerts, setDidAlerts] = useState([]);
  const [campaignDidOverrides, setCampaignDidOverrides] = useState({});

  // Loaded once for the screens that share them. Failures are swallowed
  // rather than thrown: a screen that needs its own data fetches it itself
  // and reports its own errors, and the shell must still render.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      campaignService.list().catch(() => null),
      adminService.listCustomFields().catch(() => null),
      adminService.phoneNumbers().catch(() => null),
    ])
      .then(([camp, fields, numbers]) => {
        if (cancelled) return;
        setCampaigns(camp?.data || []);
        setCustomFields(fields?.data?.custom_fields || fields?.data || []);
        setPhoneNumbers(numbers?.data?.numbers || numbers?.data || []);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCampaigns = useCallback(
    () => campaignService.list().then((r) => setCampaigns(r?.data || [])).catch(() => {}),
    []
  );

  const refreshPhoneNumbers = useCallback(
    () => adminService.phoneNumbers().then((r) => setPhoneNumbers(r?.data?.numbers || r?.data || [])).catch(() => {}),
    []
  );

  // ---- Monitoring bar ----------------------------------------------------
  // The listen/whisper/barge calls themselves go to the server through
  // monitorService and are recorded in monitoring_log. What is tracked here is
  // only what the floating bar needs to render: which session this browser
  // started, and when, so the elapsed timer counts correctly.
  const startMonitoring = useCallback((admin, agentName, type, agentId) => {
    const session = { id: nextId("mon"), admin, agentName, agentId, type, startedAt: Date.now() };
    setMonitoringSessions((prev) => [...prev, session]);
    return session.id;
  }, []);

  // Switches an in-progress session between listen/whisper/barge without
  // resetting startedAt — the elapsed timer keeps counting across a mode
  // switch, matching one real session.
  const switchMonitoringMode = useCallback((id, type) => {
    setMonitoringSessions((prev) => prev.map((s) => (s.id === id ? { ...s, type } : s)));
  }, []);

  const stopMonitoring = useCallback((id) => {
    setMonitoringSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ---- DID alerts --------------------------------------------------------
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

  // ---- DID reputation engine wrappers ------------------------------------
  // The authoritative scores are computed server-side. These wrappers exist
  // for the agent dialer, which needs to choose a caller ID from the numbers
  // it already holds without a round trip per call.
  const resolveDidSettingsForCampaign = useCallback(
    (campaignId) => resolveDidSettings(didSettings, campaignId ? campaignDidOverrides[campaignId] : null),
    [didSettings, campaignDidOverrides]
  );

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
    (campaignId, leadAreaCode) =>
      engineGetEligibleDIDs(phoneNumbers, campaignId, leadAreaCode, resolveDidSettingsForCampaign(campaignId)),
    [phoneNumbers, resolveDidSettingsForCampaign]
  );

  const selectBestDID = useCallback(
    (campaignId, leadAreaCode) =>
      engineSelectBestDID(phoneNumbers, campaignId, leadAreaCode, resolveDidSettingsForCampaign(campaignId)),
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
      loaded,
      campaigns,
      setCampaigns,
      refreshCampaigns,
      customFields,
      setCustomFields,
      phoneNumbers,
      refreshPhoneNumbers,
      didSettings,
      updateDidSettings,
      campaignDidOverrides,
      updateCampaignDidOverride,
      didAlerts,
      pushDidAlert,
      dismissDidAlert,
      resolveDidSettingsForCampaign,
      getDIDHealth,
      calculateDIDScoreById,
      getEligibleDIDs,
      selectBestDID,
      getDIDTrend,
      markDIDInUse,
      monitoringSessions,
      startMonitoring,
      stopMonitoring,
      switchMonitoringMode,
    }),
    [
      loaded,
      campaigns,
      refreshCampaigns,
      customFields,
      phoneNumbers,
      refreshPhoneNumbers,
      didSettings,
      updateDidSettings,
      campaignDidOverrides,
      updateCampaignDidOverride,
      didAlerts,
      pushDidAlert,
      dismissDidAlert,
      resolveDidSettingsForCampaign,
      getDIDHealth,
      calculateDIDScoreById,
      getEligibleDIDs,
      selectBestDID,
      getDIDTrend,
      markDIDInUse,
      monitoringSessions,
      startMonitoring,
      stopMonitoring,
      switchMonitoringMode,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
