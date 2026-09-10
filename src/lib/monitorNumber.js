// The phone number Telnyx calls to connect a supervisor to a live call for
// Listen / Whisper / Barge. Asked for once, then remembered on this device
// so a manager isn't prompted every time. Per-viewer convenience only — it
// never leaves the browser except as the `monitor_number` on a /monitor/*
// request the manager themselves triggered.
const KEY = "10x-power-dialer:monitor_callback_number";

export function getMonitorNumber() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function setMonitorNumber(value) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* private window / storage disabled — the manager will just be asked again */
  }
}

// Loose E.164-ish shaping for US 10-digit input; the backend re-normalizes
// and rejects anything it can't parse.
export function normalizeMonitorNumber(raw) {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}
