// Shared display helpers (colors/labels/formatting) for every DID
// Reputation Engine screen, so the score-band palette and formatting rules
// live in exactly one place.

export const SCORE_BAND_COLOR = {
  Healthy: "var(--color-success)",
  Warning: "var(--color-warning)",
  Critical: "#EA580C",
  Paused: "var(--color-danger)",
};

export const REGISTRATION_COLOR = {
  Registered: "var(--color-success)",
  Pending: "var(--color-warning)",
  "Not Registered": "var(--color-danger)",
};

export const COOLING_COLOR = {
  Active: "var(--color-success)",
  Cooling: "var(--color-warning)",
  Paused: "var(--color-danger)",
};

export function formatMinSec(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatHoursRemaining(untilTimestamp) {
  if (!untilTimestamp) return "—";
  const ms = untilTimestamp - Date.now();
  if (ms <= 0) return "Cooling period complete";
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  return hours >= 24 ? `${Math.ceil(hours / 24)}d remaining` : `${hours}h remaining`;
}

export function trendArrow(direction) {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}
