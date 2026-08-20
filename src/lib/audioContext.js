// Shared Web Audio API context — DTMF tones and the ringback tone both use
// this same instance rather than each creating their own, since Chrome only
// needs (and only remembers) one unlock per context.
let sharedContext = null;

export function getSharedAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedContext) sharedContext = new Ctx();
  return sharedContext;
}

// Must be invoked from inside a real user-gesture handler (click, keydown)
// — Chrome and Safari suspend a newly-created AudioContext (and block
// <audio> autoplay) until the page has real user activation, and resume()
// is what actually unlocks it once that gesture happens.
export function resumeSharedAudioContext() {
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}
