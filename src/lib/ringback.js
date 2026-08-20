import { resumeSharedAudioContext } from "./audioContext";

// Standard North American ringback cadence: 440Hz + 480Hz, 2s on / 4s off.
const FREQ_A = 440;
const FREQ_B = 480;
const RING_ON_MS = 2000;
const RING_OFF_MS = 4000;
const GAIN_LEVEL = 0.08;

let oscillators = null;
let gainNode = null;
let cadenceTimer = null;

// Starts (or restarts) the looping ringback tone — safe to call even if
// one is already playing, since it tears down any existing loop first.
export function startRingback() {
  stopRingback();
  const ctx = resumeSharedAudioContext();
  if (!ctx) return;

  gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(ctx.destination);

  const oscA = ctx.createOscillator();
  oscA.type = "sine";
  oscA.frequency.value = FREQ_A;
  const oscB = ctx.createOscillator();
  oscB.type = "sine";
  oscB.frequency.value = FREQ_B;
  oscA.connect(gainNode);
  oscB.connect(gainNode);
  oscA.start();
  oscB.start();
  oscillators = [oscA, oscB];

  let ringing = false;
  const cycle = () => {
    ringing = !ringing;
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(ringing ? GAIN_LEVEL : 0, now);
    cadenceTimer = setTimeout(cycle, ringing ? RING_ON_MS : RING_OFF_MS);
  };
  cycle();
}

// Idempotent — safe to call whether or not ringback is currently playing.
export function stopRingback() {
  if (cadenceTimer) {
    clearTimeout(cadenceTimer);
    cadenceTimer = null;
  }
  if (oscillators) {
    oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // already stopped — nothing to do
      }
    });
    oscillators = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
}
