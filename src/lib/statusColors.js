// Central agent-status color system used across every screen.

export const STATUS_LABELS = {
  available: "Available",
  on_call: "On Call",
  unready: "Unready",
  lunch: "Lunch",
  break: "Break",
  logged_out: "Logged Out",
  dispo: "In Dispo",
  dead_call: "Dead Call",
  manual_dial: "Manual Dial",
};

function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bch = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bch})`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

// Returns { color, label } for a given status + seconds elapsed in that status.
export function getStatusVisual(status, secondsInStatus = 0) {
  const label = STATUS_LABELS[status] ?? status;

  switch (status) {
    case "available":
      return { color: "#3B82F6", label };
    case "logged_out":
      return { color: "#4B5563", label };
    case "on_call": {
      if (secondsInStatus < 30) return { color: "#86EFAC", label };
      if (secondsInStatus < 180) return { color: "#22C55E", label };
      if (secondsInStatus < 300) return { color: "#15803D", label };
      return { color: "#14532D", label };
    }
    case "unready": {
      const t = Math.min(secondsInStatus / (30 * 60), 1);
      return { color: lerpColor("#FCA5A5", "#991B1B", t), label };
    }
    case "lunch": {
      const t = Math.min(secondsInStatus / (30 * 60), 1);
      return { color: lerpColor("#FDE68A", "#B45309", t), label };
    }
    case "break": {
      const t = Math.min(secondsInStatus / (15 * 60), 1);
      return { color: lerpColor("#FED7AA", "#C2410C", t), label };
    }
    case "dispo":
      return { color: "#D97706", label };
    case "dead_call":
      return { color: "#DC2626", label };
    case "manual_dial": {
      const t = Math.min(secondsInStatus / (30 * 60), 1);
      return { color: lerpColor("#5EEAD4", "#0F766E", t), label };
    }
    default:
      return { color: "#4B5563", label };
  }
}

// Subtle full-row background tint for the admin Agent Monitor table — much
// softer than the badge/pill colors above so row text stays legible.
export function monitorRowBackground(status, secondsInStatus = 0) {
  const mix = (hex, pct) => `color-mix(in srgb, ${hex} ${pct}%, white)`;

  switch (status) {
    case "available":
      return mix("#3B82F6", 6);
    case "on_call": {
      if (secondsInStatus < 30) return mix("#86EFAC", 22);
      if (secondsInStatus < 180) return mix("#22C55E", 16);
      if (secondsInStatus < 300) return mix("#15803D", 12);
      return mix("#14532D", 10);
    }
    case "dispo":
      return mix("#D97706", 10);
    case "unready":
      return mix("#EA580C", 8);
    case "lunch":
      return mix("#FDE68A", 22);
    case "break":
      return mix("#FED7AA", 18);
    case "dead_call":
      return mix("#DC2626", 8);
    case "logged_out":
      return mix("#6B7280", 6);
    case "manual_dial":
      return mix("#0F766E", 10);
    default:
      return "transparent";
  }
}

export function secondsSince(timestampMs) {
  return Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
}

export function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHMS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Call-timer background tint, matching the on-call color progression but softened for large surfaces.
export function callTimerBackground(seconds) {
  if (seconds < 30) return "rgba(134, 239, 172, 0.12)";
  if (seconds < 180) return "rgba(34, 197, 94, 0.14)";
  if (seconds < 300) return "rgba(21, 128, 61, 0.18)";
  return "rgba(20, 83, 45, 0.24)";
}

export function wrapUpVisual(seconds) {
  if (seconds <= 45) return { color: "#10B981", zone: "green" };
  if (seconds <= 60) return { color: "#F59E0B", zone: "yellow" };
  return { color: "#EF4444", zone: "red" };
}
