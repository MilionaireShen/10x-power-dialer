// DID Reputation Engine — a self-contained, framework-agnostic scoring and
// rotation module. It knows nothing about React, AppDataContext, or the
// dialer UI: every function takes plain data in and returns plain data out.
// The dialer (AgentDashboard) and the admin screens only ever talk to this
// module through the functions below (never by reaching into a DID object's
// internals directly), so swapping in a real/external reputation provider
// later only means replacing this file.

export const DEFAULT_WEIGHTS = {
  answerRate: 25,
  connectRate: 15,
  avgDuration: 15,
  shortCallPct: 15,
  dncRequests: 10,
  complaints: 10,
  numberAge: 5,
  registration: 5,
};

export const DEFAULT_THRESHOLDS = {
  healthy: 80,
  warning: 60,
  critical: 40,
  autoPause: 39,
};

export const DEFAULT_COOLING_RULES = {
  maxCallsPerDay: 300,
  maxCallsPerHour: 50,
  minAnswerRate: 8,
  maxShortCallPct: 25,
  maxDncRequests: 3,
  coolingPeriodHours: 24,
  autoResume: true,
  resumeMinScore: 60,
};

export const DEFAULT_ROTATION_PRIORITIES = [
  { key: "areaCode", label: "Area code match" },
  { key: "score", label: "DID health score" },
  { key: "recentUsage", label: "Recent usage balance" },
  { key: "answerRateHistory", label: "Historical answer rate" },
  { key: "registration", label: "Registration status" },
];

export const DEFAULT_ALERT_SETTINGS = {
  scoreBelow: 60,
  answerRateBelow: 10,
  dncExceeds: 3,
  recipients: [],
  method: "both", // "email" | "in-app" | "both"
};

export const DEFAULT_REGISTRATION_SETTINGS = {
  requireRegistration: false,
  blockUnregistered: false,
  alertOnUnregistered: true,
};

export const DEFAULT_DID_SETTINGS = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
  cooling: DEFAULT_COOLING_RULES,
  rotationPriorities: DEFAULT_ROTATION_PRIORITIES,
  alerts: DEFAULT_ALERT_SETTINGS,
  registration: DEFAULT_REGISTRATION_SETTINGS,
};

// ---------------------------------------------------------------------------
// Settings resolution — campaign overrides win per-section over the global
// default, exactly matching the "global unless overridden" core principle.
// ---------------------------------------------------------------------------
export function resolveDidSettings(globalSettings, campaignOverride) {
  if (!campaignOverride) return globalSettings;
  const resolved = { ...globalSettings };
  for (const section of Object.keys(globalSettings)) {
    if (campaignOverride[section]?.enabled) {
      resolved[section] = campaignOverride[section].value;
    }
  }
  return resolved;
}

export function extractAreaCode(phoneNumber) {
  const digits = (phoneNumber || "").replace(/\D/g, "");
  const withoutCountry = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return withoutCountry.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
function scaleMetric(value, best, worst) {
  if (best === worst) return 50;
  const t = (value - worst) / (best - worst);
  return Math.max(0, Math.min(100, t * 100));
}

// Sub-scores use realistic outbound-dialing ranges (a 20% answer rate is
// excellent for cold outbound; 40%+ never happens) rather than naive 0-100%.
function subScores(did) {
  const m = did.metrics;
  return {
    answerRate: scaleMetric(m.answerRate, 25, 2),
    connectRate: scaleMetric(m.connectRate, 35, 3),
    avgDuration: scaleMetric(m.avgDurationSec, 240, 10),
    shortCallPct: scaleMetric(m.shortCallPct, 0, 60),
    dncRequests: scaleMetric(m.dncRequests, 0, 15),
    complaints: scaleMetric(m.complaints, 0, 8),
    numberAge: scaleMetric(did.ageInDays, 365, 0),
    registration: did.registrationStatus === "Registered" ? 100 : did.registrationStatus === "Pending" ? 50 : 0,
  };
}

// calculateDIDScore(didId, weights) per the spec — but since this module
// never holds DID state itself, it accepts the DID object directly. The
// AppDataContext wrapper resolves the id -> object lookup before calling in.
export function calculateDIDScore(did, weights = DEFAULT_WEIGHTS) {
  const scores = subScores(did);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
  let weighted = 0;
  for (const key of Object.keys(weights)) {
    weighted += (scores[key] ?? 0) * (weights[key] / totalWeight);
  }
  return Math.round(Math.max(0, Math.min(100, weighted)));
}

export function getScoreStatus(score, thresholds = DEFAULT_THRESHOLDS) {
  if (score >= thresholds.healthy) return "Healthy";
  if (score >= thresholds.warning) return "Warning";
  if (score >= thresholds.critical) return "Critical";
  return "Paused";
}

export function getDIDHealth(did, settings = DEFAULT_DID_SETTINGS) {
  const score = calculateDIDScore(did, settings.weights);
  const status = did.coolingStatus === "Paused" ? "Paused" : getScoreStatus(score, settings.thresholds);
  return {
    didId: did.id,
    number: did.number,
    score,
    status,
    metrics: did.metrics,
    trend: did.trend,
    registrationStatus: did.registrationStatus,
    registrationCarrier: did.registrationCarrier,
    coolingStatus: did.coolingStatus,
    coolingReason: did.coolingReason,
    coolingUntil: did.coolingUntil,
    pausedReason: did.pausedReason,
    pausedBy: did.pausedBy,
    lastUpdated: did.lastUpdated ?? Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Eligibility + rotation
// ---------------------------------------------------------------------------
export function isDIDEligible(did, settings = DEFAULT_DID_SETTINGS) {
  if (did.coolingStatus === "Paused" || did.coolingStatus === "Cooling") return false;
  const score = calculateDIDScore(did, settings.weights);
  if (score < settings.thresholds.autoPause) return false;
  if (did.metrics.callsToday >= settings.cooling.maxCallsPerDay) return false;
  if (did.metrics.callsThisHour >= settings.cooling.maxCallsPerHour) return false;
  if (settings.registration.blockUnregistered && did.registrationStatus !== "Registered") return false;
  return true;
}

export function getEligibleDIDs(dids, campaignId, leadAreaCode, settings = DEFAULT_DID_SETTINGS) {
  return dids
    .filter((d) => !campaignId || d.campaignId === campaignId)
    .filter((d) => isDIDEligible(d, settings))
    .map((d) => ({ did: d, score: calculateDIDScore(d, settings.weights) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.did);
}

// selectBestDID walks the admin-ordered rotation priority list and applies
// each factor as a successive filter/tiebreak — earlier priorities narrow
// the pool first, later ones only break ties within what's left.
export function selectBestDID(dids, campaignId, leadAreaCode, settings = DEFAULT_DID_SETTINGS) {
  let pool = getEligibleDIDs(dids, campaignId, leadAreaCode, settings);
  if (pool.length === 0) return null;

  for (const priority of settings.rotationPriorities) {
    if (pool.length <= 1) break;
    switch (priority.key) {
      case "areaCode": {
        const matches = pool.filter((d) => extractAreaCode(d.number) === leadAreaCode);
        if (matches.length > 0) pool = matches;
        break;
      }
      case "score": {
        const best = Math.max(...pool.map((d) => calculateDIDScore(d, settings.weights)));
        pool = pool.filter((d) => calculateDIDScore(d, settings.weights) >= best - 2);
        break;
      }
      case "recentUsage": {
        const oldest = Math.min(...pool.map((d) => d.lastUsedAt ?? 0));
        pool = pool.filter((d) => (d.lastUsedAt ?? 0) <= oldest + 1000 * 60 * 5);
        break;
      }
      case "answerRateHistory": {
        const best = Math.max(...pool.map((d) => d.metrics.answerRate));
        pool = pool.filter((d) => d.metrics.answerRate >= best - 1);
        break;
      }
      case "registration": {
        const registered = pool.filter((d) => d.registrationStatus === "Registered");
        if (registered.length > 0) pool = registered;
        break;
      }
      default:
        break;
    }
  }

  return pool[0];
}

// ---------------------------------------------------------------------------
// Outcome recording — pure reducers. AppDataContext calls these then persists
// the returned object; this module never mutates its input.
// ---------------------------------------------------------------------------
export function applyCallOutcome(did, outcome) {
  const m = { ...did.metrics };
  const priorTotal = m.totalCalls ?? 0;
  const priorAnswered = Math.round((m.answerRate / 100) * priorTotal);
  const priorConnected = Math.round((m.connectRate / 100) * priorTotal);
  const priorShort = Math.round((m.shortCallPct / 100) * priorTotal);

  const newTotal = priorTotal + 1;
  const answered = Boolean(outcome.answered);
  const connected = answered && !outcome.rejected;
  const isShort = connected && typeof outcome.durationSec === "number" && outcome.durationSec < 30;

  m.totalCalls = newTotal;
  m.callsToday = (m.callsToday ?? 0) + 1;
  m.callsThisHour = (m.callsThisHour ?? 0) + 1;
  m.answerRate = Number((((priorAnswered + (answered ? 1 : 0)) / newTotal) * 100).toFixed(1));
  m.connectRate = Number((((priorConnected + (connected ? 1 : 0)) / newTotal) * 100).toFixed(1));
  m.shortCallPct = Number((((priorShort + (isShort ? 1 : 0)) / newTotal) * 100).toFixed(1));

  if (typeof outcome.durationSec === "number" && connected) {
    const priorDurationTotal = m.avgDurationSec * Math.max(1, priorConnected);
    const newConnectedCount = priorConnected + 1;
    m.avgDurationSec = Math.round((priorDurationTotal + outcome.durationSec) / newConnectedCount);
  }

  if (outcome.dncRequest) m.dncRequests = (m.dncRequests ?? 0) + 1;
  if (outcome.complaint) m.complaints = (m.complaints ?? 0) + 1;

  return {
    ...did,
    metrics: m,
    lastUsedAt: Date.now(),
    lastUpdated: Date.now(),
  };
}

export function applyDIDEvent(did, eventType, detail = "") {
  const event = { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: eventType, detail, timestamp: Date.now() };
  return { ...did, events: [event, ...(did.events ?? [])], lastUpdated: Date.now() };
}

// Evaluates the admin-configured cooling triggers against a DID's current
// metrics/score. Returns the first rule that trips, or null.
export function checkCoolingTriggers(did, settings = DEFAULT_DID_SETTINGS) {
  const { cooling, thresholds, weights } = settings;
  const m = did.metrics;
  if (m.callsToday >= cooling.maxCallsPerDay) {
    return `Call volume threshold reached (${m.callsToday}/${cooling.maxCallsPerDay} calls today)`;
  }
  if (m.totalCalls >= 20 && m.answerRate < cooling.minAnswerRate) {
    return `Answer rate dropped below ${cooling.minAnswerRate}% (currently ${m.answerRate}%)`;
  }
  if (m.totalCalls >= 20 && m.shortCallPct > cooling.maxShortCallPct) {
    return `Short call percentage exceeded ${cooling.maxShortCallPct}% (currently ${m.shortCallPct}%)`;
  }
  if (m.dncRequests >= cooling.maxDncRequests) {
    return `DNC requests reached the limit (${m.dncRequests}/${cooling.maxDncRequests})`;
  }
  const score = calculateDIDScore(did, weights);
  if (score < thresholds.autoPause) {
    return `Score dropped below the auto-pause threshold (${score}/${thresholds.autoPause})`;
  }
  return null;
}

export function pauseDID(did, reason, pausedBy) {
  return applyDIDEvent(
    { ...did, coolingStatus: "Paused", pausedReason: reason, pausedBy, pausedAt: Date.now(), coolingReason: null, coolingUntil: null },
    "paused",
    reason
  );
}

export function beginCooling(did, reason, coolingPeriodHours) {
  const coolingUntil = Date.now() + coolingPeriodHours * 60 * 60 * 1000;
  return applyDIDEvent(
    { ...did, coolingStatus: "Cooling", coolingReason: reason, coolingUntil, pausedReason: null, pausedBy: null, pausedAt: null },
    "cooling_started",
    reason
  );
}

export function resumeDID(did, resumedBy) {
  return applyDIDEvent(
    { ...did, coolingStatus: "Active", coolingReason: null, coolingUntil: null, pausedReason: null, pausedBy: null, pausedAt: null },
    "resumed",
    resumedBy ? `Resumed by ${resumedBy}` : "Auto-resumed after cooling period"
  );
}

// Can this DID be resumed right now? (cooling period elapsed + score high enough)
export function canResume(did, settings = DEFAULT_DID_SETTINGS) {
  const coolingElapsed = !did.coolingUntil || Date.now() >= did.coolingUntil;
  const score = calculateDIDScore(did, settings.weights);
  return coolingElapsed && score >= settings.cooling.resumeMinScore;
}

// ---------------------------------------------------------------------------
// Trend
// ---------------------------------------------------------------------------
const PERIOD_MS = { day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000 };

export function getDIDTrend(did, period = "week", settings = DEFAULT_DID_SETTINGS) {
  const windowMs = PERIOD_MS[period] ?? PERIOD_MS.week;
  const cutoff = Date.now() - windowMs;
  const history = did.history ?? [];
  const inWindow = history.filter((h) => h.timestamp >= cutoff);
  const oldest = inWindow[0] ?? history[0];
  const currentScore = calculateDIDScore(did, settings.weights);
  const delta = oldest ? currentScore - oldest.score : 0;

  const factors = [];
  if (oldest) {
    if (did.metrics.answerRate < oldest.answerRate) {
      factors.push(`Answer rate decreased ${Math.abs(Math.round(((oldest.answerRate - did.metrics.answerRate) / oldest.answerRate) * 100))}%`);
    }
    if (did.metrics.shortCallPct > oldest.shortCallPct) {
      factors.push(`Short calls increased ${Math.round(did.metrics.shortCallPct - oldest.shortCallPct)} pts`);
    }
    if (did.metrics.dncRequests > oldest.dncRequests) {
      factors.push("DNC requests increased");
    }
    if (did.metrics.callsToday > (oldest.callsToday ?? 0) * 1.3) {
      factors.push(`Daily volume increased ${Math.round(((did.metrics.callsToday - (oldest.callsToday ?? 1)) / (oldest.callsToday ?? 1)) * 100)}%`);
    }
    if (factors.length === 0 && delta > 0) factors.push("Answer rate and call quality trending up");
  }

  return {
    period,
    currentScore,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    factors,
    history: inWindow.length > 0 ? inWindow : history,
  };
}
