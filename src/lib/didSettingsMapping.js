import { DEFAULT_DID_SETTINGS } from "./didReputationEngine";

// Translates between the shape the settings screen and the scoring engine work
// in (grouped by section) and the shape did_reputation_settings stores (one
// flat column per value).
//
// A mapping layer rather than a rewrite of either side: the screen groups
// values because that is how an operator thinks about them, and the table
// keeps them flat because that is what a row is. Neither is wrong.

// The nested keys must match DEFAULT_WEIGHTS exactly. A key that differs by a
// name — shortCalls against shortCallPct — does not fail loudly: it adds a
// ninth entry alongside the default it failed to replace, and the weights
// silently total 115 instead of 100.
const WEIGHT = {
  answerRate: "weight_answer_rate",
  connectRate: "weight_connect_rate",
  avgDuration: "weight_avg_duration",
  shortCallPct: "weight_short_calls",
  dncRequests: "weight_dnc_requests",
  complaints: "weight_complaints",
  numberAge: "weight_number_age",
  registration: "weight_registration",
};

const THRESHOLD = {
  healthy: "threshold_healthy",
  warning: "threshold_warning",
  critical: "threshold_critical",
  autoPause: "threshold_auto_pause",
};

const COOLING = {
  maxCallsPerDay: "max_calls_per_day",
  maxCallsPerHour: "max_calls_per_hour",
  minAnswerRate: "min_answer_rate",
  maxShortCallPct: "max_short_call_percentage",
  maxDncRequests: "max_dnc_before_cooling",
  coolingPeriodHours: "cooling_period_hours",
  autoResume: "auto_resume_after_cooling",
  resumeMinScore: "threshold_resume",
};

const ALERTS = {
  scoreBelow: "alert_score_threshold",
  answerRateBelow: "alert_answer_rate_threshold",
};

const REGISTRATION = {
  blockUnregistered: "block_unregistered",
  alertOnUnregistered: "alert_unregistered",
};

/**
 * Reads a section out of the flat row.
 *
 * A mapping key that does not exist on the defaults would not replace
 * anything — it would sit alongside the default it meant to override, which
 * is how the weights came to total 115 instead of 100. Checked in development
 * so the next mismatch is loud rather than a number quietly being wrong.
 */
function pull(row, map, fallback) {
  if (import.meta.env.DEV) {
    const stray = Object.keys(map).filter((k) => !(k in fallback));
    if (stray.length) {
      console.error(
        `[didSettingsMapping] these keys do not exist on the defaults and will be added rather than replace anything: ${stray.join(", ")}`,
      );
    }
  }

  const out = { ...fallback };
  for (const [nested, column] of Object.entries(map)) {
    if (row?.[column] !== undefined && row?.[column] !== null) out[nested] = row[column];
  }
  return out;
}

/**
 * Row -> the grouped shape the screen renders.
 *
 * A null row means nothing has been configured, so the defaults are returned
 * whole rather than a half-populated object of zeros.
 */
export function toNested(row) {
  if (!row) return DEFAULT_DID_SETTINGS;
  return {
    weights: pull(row, WEIGHT, DEFAULT_DID_SETTINGS.weights),
    thresholds: pull(row, THRESHOLD, DEFAULT_DID_SETTINGS.thresholds),
    cooling: pull(row, COOLING, DEFAULT_DID_SETTINGS.cooling),
    alerts: pull(row, ALERTS, DEFAULT_DID_SETTINGS.alerts),
    registration: pull(row, REGISTRATION, DEFAULT_DID_SETTINGS.registration),
    // Rotation priority is an ordered list, which a flat table cannot hold as
    // one column per entry. Stored as the order of its keys.
    rotationPriorities: parseRotation(row.rotation_priority),
  };
}

function parseRotation(stored) {
  if (!stored) return DEFAULT_DID_SETTINGS.rotationPriorities;
  const order = String(stored).split(",").map((s) => s.trim()).filter(Boolean);
  const byKey = Object.fromEntries(DEFAULT_DID_SETTINGS.rotationPriorities.map((p) => [p.key, p]));
  const ordered = order.map((k) => byKey[k]).filter(Boolean);
  // Anything the stored order does not mention is appended, so a priority
  // added to the product later does not silently disappear from the list.
  const missing = DEFAULT_DID_SETTINGS.rotationPriorities.filter((p) => !order.includes(p.key));
  return [...ordered, ...missing];
}

/** The grouped shape -> the flat columns the API accepts. */
export function toFlat(nested) {
  const out = {};
  for (const [key, column] of Object.entries(WEIGHT)) out[column] = nested.weights?.[key];
  for (const [key, column] of Object.entries(THRESHOLD)) out[column] = nested.thresholds?.[key];
  for (const [key, column] of Object.entries(COOLING)) out[column] = nested.cooling?.[key];
  for (const [key, column] of Object.entries(ALERTS)) out[column] = nested.alerts?.[key];
  for (const [key, column] of Object.entries(REGISTRATION)) out[column] = nested.registration?.[key];
  out.rotation_priority = (nested.rotationPriorities || []).map((p) => p.key).join(",");

  // Undefined values are dropped rather than sent as null, so a partial save
  // does not blank a column the screen never touched.
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}
