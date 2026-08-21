import { useCallback, useEffect, useRef, useState } from "react";
import { createCallRecorder, createChunkUploader, CHUNK_MS } from "./callRecorder";
import recordingService from "../services/recordingService";

function log(...args) {
  console.log("[recording]", ...args);
}

/**
 * Records the live call and streams it to the backend in chunks while the call
 * is still in progress.
 *
 * Deliberately observes the softphone rather than modifying it: it reads the
 * two MediaStreams the SIP session already exposes and never touches
 * registration, negotiation, or the call state machine. If anything here
 * throws, the call itself is unaffected — recording failures are reported, not
 * propagated.
 *
 * @param softphone - the useSoftphone() return value.
 * @param callContext - metadata to file the recording under.
 */
export function useCallRecording({ softphone, enabled = true }) {
  const [status, setStatus] = useState("idle"); // idle | recording | uploading | completed | incomplete | failed
  const [stats, setStats] = useState({ uploaded: 0, pending: 0, failed: 0 });
  const [error, setError] = useState(null);

  // Set by the dialer the moment it declares a manual call, so the recording
  // files against the same attributed row rather than floating unlinked. Held
  // in a ref because it must be readable by the start effect without making
  // the effect re-run and restart a recording mid-call.
  const callContextRef = useRef(null);
  const setCallContext = useCallback((ctx) => {
    callContextRef.current = ctx;
  }, []);

  const recorderRef = useRef(null);
  const uploaderRef = useRef(null);
  const sessionIdRef = useRef(null);
  const startedAtRef = useRef(null);
  // Guards against a re-render starting a second recorder for the same call.
  const activeCallRef = useRef(null);

  const stopAndFinalize = useCallback(async () => {
    const recorder = recorderRef.current;
    const uploader = uploaderRef.current;
    const sessionId = sessionIdRef.current;
    recorderRef.current = null;
    activeCallRef.current = null;

    if (!recorder || !sessionId) return;

    setStatus("uploading");
    try {
      const chunkCount = await recorder.stop();

      // stop() resolves on MediaRecorder's onstop, but the final slice arrives
      // via ondataavailable just before that and is enqueued asynchronously
      // (IndexedDB). Draining immediately therefore raced the tail chunk: it
      // was still being written when finalize ran, so the backend counted one
      // chunk fewer than expected and marked an otherwise fine recording
      // 'incomplete'. Waiting for every enqueue to settle first removes the race.
      await uploader?.settled?.();
      await uploader?.drain();
      // A chunk that failed its in-drain retries is worth one more attempt
      // here, while the page is still alive.
      if (uploader?.stats?.failed) await uploader.drain();

      const durationSeconds = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : null;

      const res = await recordingService.finalize(sessionId, {
        expected_chunks: chunkCount,
        duration_seconds: durationSeconds,
      });
      const finalStatus = res?.data?.status || "completed";
      setStatus(finalStatus);
      log("finalized:", finalStatus, res?.data);
    } catch (err) {
      setStatus("failed");
      setError(err?.message || "Could not finalize the recording.");
      log("finalize failed:", err);
    } finally {
      sessionIdRef.current = null;
      uploaderRef.current = null;
      startedAtRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    const user = softphone?.userAgentRef?.current;
    const localStream = softphone?.localMediaStream;
    const remoteStream = softphone?.remoteMediaStream;

    if (!localStream && !remoteStream) {
      log("no media streams available yet — not recording");
      return;
    }

    setError(null);
    const ctx = callContextRef.current || {};
    try {
      const created = await recordingService.startSession({
        call_id: ctx.callId ?? null,
        campaign_id: ctx.campaignId ?? null,
        from_number: ctx.fromNumber ?? null,
        to_number: ctx.toNumber ?? null,
        direction: ctx.direction ?? "outbound",
        format: "audio/webm;codecs=opus",
      });
      const sessionId = created?.data?.id;
      if (!sessionId) throw new Error("No recording session id returned.");
      sessionIdRef.current = sessionId;
      startedAtRef.current = Date.now();

      const uploader = createChunkUploader({
        sessionId,
        uploadFn: recordingService.uploadChunk,
        onStateChange: setStats,
      });
      uploaderRef.current = uploader;

      const recorder = createCallRecorder({
        localStream,
        remoteStream,
        onChunk: ({ chunkNumber, blob }) => uploader.enqueue({ chunkNumber, blob }),
        onError: (err) => {
          setError(err?.message || "Recorder error.");
          log("recorder error:", err);
        },
      });
      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
      log(`recording session ${sessionId} started (${CHUNK_MS}ms chunks, ${recorder.mimeType})`);
    } catch (err) {
      setStatus("failed");
      setError(err?.message || "Could not start recording.");
      log("start failed:", err);
    }
    void user;
  }, [softphone]);

  // Starts when the call is genuinely connected — before that the remote
  // stream carries no track and there would be nothing of the customer to
  // record.
  useEffect(() => {
    if (!enabled) return;
    const connected = softphone?.callPhase === "connected";

    if (connected && !activeCallRef.current) {
      activeCallRef.current = callContextRef.current?.callId || `call-${Date.now()}`;
      startRecording();
    }
    if (!connected && activeCallRef.current) {
      stopAndFinalize();
      callContextRef.current = null;
    }
  }, [enabled, softphone?.callPhase, startRecording, stopAndFinalize]);

  // A refresh or tab close tears down the WebRTC session regardless, so the
  // most that can be done is flush what is already queued. Chunks uploaded up
  // to this point are already durable server-side; the backend reaper marks
  // the session interrupted when its heartbeat goes stale.
  useEffect(() => {
    const onUnload = () => {
      uploaderRef.current?.drain?.();
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, []);

  // Connectivity returning is the natural moment to clear a backlog.
  useEffect(() => {
    const onOnline = () => uploaderRef.current?.drain?.();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return { status, stats, error, setCallContext };
}
