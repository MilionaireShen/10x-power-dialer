import { useCallback, useEffect, useRef, useState } from "react";

// The agent-facing "your audio is working" recording. Served from public/ so
// it is a real deployed asset rather than something bundled or fetched from a
// developer's machine.
export const LOGIN_PROMPT_SRC = "/audio/login-prompt.m4a";

/**
 * Plays the audio-connectivity prompt through the same output path the agent
 * hears calls on, once per session, as soon as the softphone is genuinely
 * ready.
 *
 * Deliberately a separate <audio> element from the one carrying call audio:
 * that element's srcObject is owned by SIP.js, and assigning a src to it to
 * play a file would interfere with the live media stream. Instead this
 * mirrors the call element's sinkId, so both play out of the same device —
 * today that is the browser default for both (no device picker exists yet),
 * and if one is added the prompt follows it automatically rather than
 * silently diverging to another device.
 *
 * @param ready - true when the softphone has registered AND audio is usable.
 * @param sessionKey - changes per login, which is what re-arms the prompt.
 * @param callAudioRef - ref to the element carrying remote call audio.
 */
export function useAudioPrompt({ ready, sessionKey, callAudioRef }) {
  const promptRef = useRef(null);
  // "idle" | "played" | "blocked" — blocked means the browser refused
  // autoplay and a user gesture is required before anything can be heard.
  const [promptState, setPromptState] = useState("idle");
  const playedForSessionRef = useRef(null);

  // Routes the prompt to whatever device call audio is using. setSinkId is
  // Chromium-only and rejects without permission, so failure here is not
  // worth surfacing — it just means the default device is used, which is
  // also what the call element is doing.
  const matchCallOutputDevice = useCallback(() => {
    const el = promptRef.current;
    const callEl = callAudioRef?.current;
    if (!el || !callEl) return;
    const sinkId = callEl.sinkId;
    if (sinkId && typeof el.setSinkId === "function" && el.sinkId !== sinkId) {
      el.setSinkId(sinkId).catch(() => {});
    }
  }, [callAudioRef]);

  // Returns a promise so the caller can tell a real playback failure apart
  // from a rejected autoplay attempt.
  const play = useCallback(() => {
    const el = promptRef.current;
    if (!el) return Promise.reject(new Error("Audio prompt element not mounted."));
    matchCallOutputDevice();
    el.currentTime = 0;
    el.muted = false;
    if (el.volume === 0) el.volume = 1;
    return el.play();
  }, [matchCallOutputDevice]);

  // Manual trigger for the "Test Audio" control. A click is real user
  // activation, so this also clears a previously blocked state.
  const testAudio = useCallback(() => {
    return play()
      .then(() => setPromptState("played"))
      .catch(() => setPromptState("blocked"));
  }, [play]);

  useEffect(() => {
    // Gated on the softphone actually being ready, not merely on being
    // logged in — the point of the prompt is to confirm the audio path,
    // so playing it before that path exists would assert something untrue.
    if (!ready || !sessionKey) return;
    // One prompt per login. This guard, not the effect's dependencies, is
    // what prevents a re-render or a softphone state change from replaying it.
    if (playedForSessionRef.current === sessionKey) return;
    playedForSessionRef.current = sessionKey;

    play()
      .then(() => setPromptState("played"))
      .catch(() => {
        // Autoplay policy refused it. Not retried on a timer — that would
        // just produce repeated console errors and never succeed. The UI
        // offers an explicit control instead.
        setPromptState("blocked");
      });
  }, [ready, sessionKey, play]);

  // Re-arms on logout so the next login prompts again.
  useEffect(() => {
    if (!sessionKey) {
      playedForSessionRef.current = null;
      setPromptState("idle");
    }
  }, [sessionKey]);

  return { promptRef, promptState, testAudio, playPrompt: play };
}

// Maps the softphone's own state to what can honestly be claimed about
// audio. Registration alone is not enough: a blocked microphone leaves the
// agent unable to be heard, so that is reported as not connected rather than
// green.
export function audioStatusFor(softphoneStatus, micBlocked) {
  if (micBlocked) return { level: "error", label: "Audio Not Connected — microphone blocked", color: "#DC2626" };
  switch (softphoneStatus) {
    case "registered":
      return { level: "ok", label: "Audio Connected", color: "#059669" };
    case "connecting":
    case "idle":
      return { level: "pending", label: "Audio Initializing…", color: "#D97706" };
    default:
      return { level: "error", label: "Audio Not Connected", color: "#DC2626" };
  }
}
