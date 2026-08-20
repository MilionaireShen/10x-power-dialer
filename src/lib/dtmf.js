import { resumeSharedAudioContext } from "./audioContext";

// Standard DTMF (dual-tone multi-frequency) keypad frequency pairs.
const DTMF_FREQUENCIES = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

// Plays the touch-tone pair for a single keypad digit. Silently no-ops for
// anything that isn't a real DTMF character (letters, punctuation from a
// formatted phone number, etc.) so callers can pass raw typed input through
// without pre-filtering it themselves.
export function playDtmfTone(digit, durationMs = 150) {
  const freqs = DTMF_FREQUENCIES[digit];
  if (!freqs) return;
  const ctx = resumeSharedAudioContext();
  if (!ctx) return;

  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  const stopAt = now + durationMs / 1000;

  const oscillators = freqs.map((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    osc.connect(gain);
    return osc;
  });

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  oscillators.forEach((osc) => {
    osc.start(now);
    osc.stop(stopAt + 0.02);
  });
}

// Diffs the previous vs. next value of a controlled text input and returns
// only the digits that were newly *appended* — empty string for a
// backspace/delete/clear (next is shorter, or doesn't extend prev), so
// those cases naturally play no tone.
export function addedDtmfDigits(prev, next) {
  if (next.length <= prev.length || !next.startsWith(prev)) return "";
  return next.slice(prev.length).replace(/[^0-9*#]/g, "");
}
