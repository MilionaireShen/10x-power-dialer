import { useCallback, useEffect, useRef, useState } from "react";
import { Web } from "sip.js";
import agentService from "../services/agentService";
import { resumeSharedAudioContext } from "./audioContext";
import { startRingback, stopRingback } from "./ringback";

const { SimpleUser } = Web;

// Telnyx's public WebRTC-over-SIP signaling endpoint — used only as a
// fallback when GET /agent/sip-token doesn't return its own ws_server.
// Override with VITE_TELNYX_SIP_WS_SERVER if this account uses a
// different one.
const DEFAULT_WS_SERVER = "wss://sip.telnyx.com:7443";
const DEFAULT_DOMAIN = "sip.telnyx.com";

// Deliberately NOT gated on import.meta.env.DEV. These were dev-only, which
// meant the deployed app printed nothing at all about a failing call — the
// one place the information is actually needed, since a call that dies at
// the carrier only ever fails in production. SIP.js's own very verbose
// internal logging is still dev-only (see logLevel below); this is just our
// own lifecycle summary, which is a handful of lines per call.
function logDiag(...args) {
  console.log("[softphone]", ...args);
}
function logDiagError(...args) {
  console.error("[softphone]", ...args);
}

// Human-readable meaning for the SIP response codes an outbound INVITE
// realistically comes back with, so a failure reads as a cause rather than
// a bare number.
function sipReasonFor(code, phrase) {
  const known = {
    401: "Authentication required",
    403: "Forbidden — the carrier rejected this call (account blocked, no outbound profile, or caller ID not permitted)",
    404: "Number not found / not routable",
    407: "Proxy authentication required",
    408: "Request timeout — no answer from the network",
    480: "Temporarily unavailable",
    486: "Busy here",
    487: "Request cancelled",
    488: "Not acceptable here — media/codec negotiation failed",
    500: "Server internal error",
    503: "Service unavailable — carrier or account problem",
    603: "Declined",
  };
  return known[code] ? `${code} ${phrase || ""} — ${known[code]}` : `${code} ${phrase || ""}`.trim();
}

// GET /agent/sip-token's exact response shape hasn't been observed against
// a live backend yet, so this reads several plausible field names rather
// than assuming one exact contract.
function normalizeSipCredentials(data) {
  return {
    username: data.sip_username ?? data.username ?? data.sip_user ?? "",
    password: data.sip_password ?? data.password ?? data.sip_pass ?? data.credential ?? "",
    domain: data.sip_domain ?? data.domain ?? data.realm ?? DEFAULT_DOMAIN,
    wsServer:
      data.ws_server ??
      data.websocket_server ??
      data.wss_uri ??
      data.sip_ws_uri ??
      import.meta.env.VITE_TELNYX_SIP_WS_SERVER ??
      DEFAULT_WS_SERVER,
  };
}

// Turns whatever the agent typed into Manual Dial into a SIP destination
// URI against this account's own SIP domain. Best-effort E.164 shaping —
// good enough for US 10-digit input, not a full phone-number library.
function destinationForNumber(raw, domain) {
  const digits = raw.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : digits.length === 10 ? `+1${digits}` : `+${digits}`;
  return `sip:${e164}@${domain}`;
}

// Re-asserts that the remote <audio> element is actually able to play (not
// muted, not zero-volume) and confirms playback started — logging loudly if
// it didn't, since a silently-rejected play() (Chrome autoplay policy) is
// the single most common reason a softphone "connects" with no audio.
function verifyRemoteAudioElement(el, context) {
  if (!el) {
    logDiagError(`${context}: remote <audio> element ref is null — nothing to attach audio to`);
    return;
  }
  logDiag(
    `${context}: remote <audio> element —`,
    "srcObject set:",
    Boolean(el.srcObject),
    "muted:",
    el.muted,
    "volume:",
    el.volume,
    "paused:",
    el.paused
  );
  el.muted = false;
  if (el.volume === 0) el.volume = 1;
  el.play()
    .then(() => logDiag(`${context}: remote <audio>.play() confirmed`))
    .catch((err) => logDiagError(`${context}: remote <audio>.play() failed — likely blocked by autoplay policy:`, err));
}

/**
 * WebRTC softphone backed by SIP.js's SimpleUser, registered against
 * Telnyx using the credentials from GET /agent/sip-token. Handles
 * incoming call legs (auto-answered — this is a call-center dialer, the
 * platform decides who gets bridged to an agent, not the agent), plays a
 * local ringback tone while an outbound call is dialing/ringing, and
 * exposes mute/hold/hangup/DTMF bound to the one real concurrent session
 * SimpleUser supports.
 */
// getUserMedia rejects with a handful of DOMException names that each mean
// something quite different to the agent — "Permission denied" alone is
// not actionable, so this maps them to something they can act on.
function micErrorMessage(err) {
  switch (err?.name) {
    case "NotAllowedError":
      return "Microphone access is blocked. Allow it via the padlock icon in your browser's address bar, then retry.";
    case "NotFoundError":
      return "No microphone was found. Connect one and retry.";
    case "NotReadableError":
      return "Your microphone is already in use by another application.";
    default:
      return err?.message || "Could not access the microphone.";
  }
}

export function useSoftphone({ enabled }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | registered | unregistered | disconnected | failed
  const [statusError, setStatusError] = useState(null);
  const [callPhase, setCallPhase] = useState("idle"); // idle | ringing | connected
  // Set when a dial attempt dies locally (mic blocked, no device, etc.) —
  // i.e. before any INVITE reached the network. Distinct from a real call
  // that rang and went unanswered, which still deserves a disposition.
  const [callFailure, setCallFailure] = useState(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);

  // Everything the on-screen diagnostics panel shows. Sourced from the
  // RTCPeerConnection and the SIP session itself rather than from this
  // hook's own UI state, so it reports what the browser and carrier are
  // really doing — the UI saying "Calling…" proves nothing about whether an
  // INVITE was accepted or whether media is flowing.
  const [diagnostics, setDiagnostics] = useState({
    callState: "idle", // idle | trying | ringing | connected | ended
    sipResponse: null, // last INVITE response, e.g. "403 Forbidden — ..."
    iceState: "-",
    pcState: "-",
    mic: "-",
    localAudio: "-",
    remoteAudio: "-",
    packetsSent: 0,
    packetsReceived: 0,
  });
  const patchDiag = useCallback((patch) => setDiagnostics((d) => ({ ...d, ...patch })), []);

  const userRef = useRef(null);
  const domainRef = useRef(DEFAULT_DOMAIN);
  const remoteAudioRef = useRef(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Tear down any previous session before starting a fresh one (covers
    // the manual "Retry" path as well as the initial mount).
    if (userRef.current) {
      const stale = userRef.current;
      userRef.current = null;
      stale.unregister().catch(() => {});
      stale.disconnect().catch(() => {});
    }

    setStatus("connecting");
    setStatusError(null);

    // Non-prompting permission probe — surfaces a blocked mic in the status
    // badge at login instead of letting the agent discover it only when
    // their first dial dies with an opaque "Permission denied".
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((res) => {
          logDiag("microphone permission:", res.state);
          setMicBlocked(res.state === "denied");
          res.onchange = () => {
            logDiag("microphone permission changed to:", res.state);
            setMicBlocked(res.state === "denied");
          };
        })
        .catch(() => {
          // Firefox doesn't support the "microphone" descriptor — fall back
          // to discovering it at first dial rather than guessing.
        });
    }

    agentService
      .getSipToken()
      .then((res) => {
        logDiag("GET /agent/sip-token response:", res);
        const creds = normalizeSipCredentials(res.data || {});
        domainRef.current = creds.domain;
        if (!creds.username || !creds.password) {
          throw new Error("Softphone credentials were not returned by the server.");
        }

        const el = remoteAudioRef.current;
        logDiag("remote <audio> element present at registration time:", Boolean(el));

        const user = new SimpleUser(creds.wsServer, {
          aor: `sip:${creds.username}@${creds.domain}`,
          media: {
            remote: { audio: el ?? undefined },
            constraints: { audio: true, video: false },
          },
          userAgentOptions: {
            authorizationUsername: creds.username,
            authorizationPassword: creds.password,
            // Surfaces SIP.js's own internal per-session state-transition
            // logs (Initial/Establishing/Established/Terminated, etc.) in
            // the console alongside the delegate-level logs below.
            logLevel: import.meta.env.DEV ? "debug" : "error",
          },
          delegate: {
            onServerConnect: () => {
              logDiag("event: onServerConnect — WebSocket transport up");
              setStatus((s) => (s === "registered" ? s : "connecting"));
            },
            onServerDisconnect: (error) => {
              logDiagError("event: onServerDisconnect", error ? `— ${error.message || error}` : "(clean disconnect)");
              setStatus("disconnected");
              if (error) setStatusError(error.message || "Connection to the phone server was lost.");
            },
            onRegistered: () => {
              logDiag("event: onRegistered — REGISTER accepted");
              setStatus("registered");
              setStatusError(null);
            },
            onUnregistered: () => {
              logDiag("event: onUnregistered");
              setStatus((s) => (s === "failed" ? s : "unregistered"));
            },
            onCallCreated: () => {
              logDiag("event: onCallCreated");
            },
            // Incoming call leg from the dialer/ACD — auto-answer, since
            // the agent already signaled availability by being logged in
            // and the platform (not the agent) decides who gets bridged.
            // No local ringback here — that tone is for the agent's own
            // outbound dials, not for a leg the platform is auto-bridging.
            onCallReceived: () => {
              logDiag("event: onCallReceived — auto-answering");
              setCallPhase("ringing");
              user.answer({ sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } } }).catch((err) => {
                logDiagError("event: onCallReceived — answer() failed:", err);
                setStatusError("Could not answer the incoming call.");
                setCallPhase("idle");
              });
            },
            onCallAnswered: () => {
              logDiag("event: onCallAnswered");
              stopRingback();
              setCallPhase("connected");
              setMuted(false);
              setHeld(false);

              const remoteTracks = user.remoteMediaStream?.getAudioTracks() ?? [];
              const localTracks = user.localMediaStream?.getAudioTracks() ?? [];
              logDiag("remote audio track count:", remoteTracks.length);
              logDiag("local audio track count:", localTracks.length);
              if (localTracks.length === 0) {
                logDiagError("no local audio track — the far end will not hear this agent's mic");
              }
              if (remoteTracks.length === 0) {
                logDiagError("no remote audio track — nothing to play back yet");
              }
              patchDiag({
                callState: "connected",
                mic: localTracks.length ? `active (${localTracks.length} track)` : "NO LOCAL TRACK",
                localAudio: localTracks[0]?.enabled ? "sending" : "track disabled",
                remoteAudio: remoteTracks.length ? "track received" : "NO REMOTE TRACK",
              });

              verifyRemoteAudioElement(remoteAudioRef.current, "onCallAnswered");
            },
            onCallHangup: () => {
              logDiag("event: onCallHangup");
              stopRingback();
              setCallPhase("idle");
              setMuted(false);
              setHeld(false);
              patchDiag({ callState: "ended", iceState: "-", pcState: "-", localAudio: "-", remoteAudio: "-" });
            },
            onCallHold: (isHeld) => {
              logDiag("event: onCallHold —", isHeld ? "held" : "unheld");
              setHeld(isHeld);
            },
          },
        });

        userRef.current = user;
        return user
          .connect()
          .then(() => {
            logDiag("connect() resolved — WebSocket transport started");
            return user.register();
          })
          .then(() => logDiag("register() resolved — REGISTER request sent"));
      })
      .catch((err) => {
        logDiagError("registration failed:", err);
        setStatus("failed");
        setStatusError(err?.message || "Could not register the softphone.");
      });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      const user = userRef.current;
      userRef.current = null;
      stopRingback();
      if (user) {
        user.unregister().catch(() => {});
        user.disconnect().catch(() => {});
      }
    };
    // Intentionally re-runs only when `enabled` flips — `connect` is a
    // stable-per-`enabled`-value callback, re-including it here would just
    // re-describe the same dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Polls the live RTCPeerConnection while a call is up. Packet counters are
  // what actually separate "connected but silent" from "no media at all":
  // a call can reach Established with ICE connected and still carry zero RTP
  // in one direction, which is exactly the case a status badge cannot show.
  useEffect(() => {
    if (callPhase === "idle") return undefined;

    let cancelled = false;
    const read = async () => {
      const user = userRef.current;
      const pc = user?.session?.sessionDescriptionHandler?.peerConnection;
      if (!pc) return;

      const patch = {
        iceState: pc.iceConnectionState || "-",
        pcState: pc.connectionState || "-",
      };

      const senderTrack = pc.getSenders?.().find((s) => s.track?.kind === "audio")?.track;
      const receiverTrack = pc.getReceivers?.().find((r) => r.track?.kind === "audio")?.track;
      patch.mic = senderTrack ? (senderTrack.enabled && !senderTrack.muted ? "active" : "muted/disabled") : "NO MIC TRACK";

      try {
        const stats = await pc.getStats();
        let sent = 0;
        let received = 0;
        stats.forEach((r) => {
          if (r.type === "outbound-rtp" && r.kind === "audio") sent = r.packetsSent ?? sent;
          if (r.type === "inbound-rtp" && r.kind === "audio") received = r.packetsReceived ?? received;
        });
        patch.packetsSent = sent;
        patch.packetsReceived = received;
        patch.localAudio = sent > 0 ? `sending (${sent} pkts)` : senderTrack ? "track present, 0 packets" : "not sending";
        patch.remoteAudio = received > 0
          ? `receiving (${received} pkts)`
          : receiverTrack ? "track present, 0 packets" : "not receiving";
      } catch {
        // getStats can reject once the PC is closing — the ICE/PC states
        // above are still worth reporting.
      }

      if (!cancelled) patchDiag(patch);
    };

    read();
    const id = setInterval(read, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [callPhase, patchDiag]);

  // Must be called synchronously from within the click handler that starts
  // a call — Chrome/Safari require real user activation before an <audio>
  // element or AudioContext is allowed to produce sound. Priming both here
  // means the *later*, async play() SIP.js/ringback issue once the call is
  // actually placed no longer gets silently blocked.
  const unlockAudio = useCallback(() => {
    resumeSharedAudioContext();
    const el = remoteAudioRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    el.play()
      .then(() => logDiag("unlockAudio: <audio> element primed via user gesture"))
      .catch((err) => logDiag("unlockAudio: priming play() rejected (expected if no media yet):", err?.message || err));
  }, []);

  const call = useCallback(
    (number) => {
      const user = userRef.current;
      if (!user || status !== "registered") {
        const message = "Softphone is not registered yet.";
        // Reported through the same callFailure channel as every other dial
        // failure. Previously this returned a bare rejection without
        // touching callPhase, so the consumer's phase-transition effect
        // never fired, the Dial button stayed stuck reading "Calling…", and
        // no Hang Up control ever appeared because the ringing screen was
        // never reached.
        setCallFailure({ message, name: "NotRegistered" });
        setCallPhase("idle");
        patchDiag({ callState: "ended", sipResponse: "not sent — softphone not registered" });
        return Promise.reject(new Error(message));
      }
      unlockAudio();
      setCallFailure(null);
      // "trying", not "ringing": the INVITE has only just gone out and the
      // far end has not been alerted yet. Ringback deliberately does NOT
      // start here — playing it now would be a fabricated tone implying the
      // destination is ringing when nothing has confirmed that. It starts on
      // a real 180/183 below.
      setCallPhase("ringing");
      patchDiag({ callState: "trying", sipResponse: null, mic: "acquiring…", packetsSent: 0, packetsReceived: 0 });

      const target = destinationForNumber(number, domainRef.current);
      logDiag("placing call to", target);

      return user
        .call(
          target,
          undefined,
          {
            requestDelegate: {
              // 180 Ringing / 183 Session Progress — the destination is
              // genuinely being alerted. This is the only point at which a
              // local ringback tone is honest.
              onProgress: (response) => {
                const code = response?.message?.statusCode;
                logDiag("INVITE progress:", code, response?.message?.reasonPhrase);
                patchDiag({ callState: "ringing", sipResponse: sipReasonFor(code, response?.message?.reasonPhrase) });
                // 183 usually carries early media (real ringback from the
                // carrier); generating our own on top would double it.
                if (code === 180) startRingback();
              },
              onAccept: (response) => {
                logDiag("INVITE accepted:", response?.message?.statusCode);
                stopRingback();
              },
              // A rejected INVITE previously surfaced only as a generic
              // failure, so "no ringback, nothing happened" gave no clue
              // that the carrier had actively refused the call.
              onReject: (response) => {
                const code = response?.message?.statusCode;
                const phrase = response?.message?.reasonPhrase;
                const reason = sipReasonFor(code, phrase);
                logDiagError("INVITE rejected:", reason);
                stopRingback();
                patchDiag({ callState: "ended", sipResponse: reason });
                setCallFailure({ message: `Call rejected by the carrier: ${reason}`, name: "SipRejected", sipCode: code });
                setCallPhase("idle");
              },
            },
          }
        )
        .catch((err) => {
          logDiagError("call() failed:", err);
          stopRingback();
          const isMicError = ["NotAllowedError", "NotFoundError", "NotReadableError"].includes(err?.name);
          if (isMicError) setMicBlocked(true);
          const message = isMicError ? micErrorMessage(err) : err?.message || "Could not place the call.";
          // sipResponse is deliberately left as-is: if onReject already set
          // a carrier reason, that is more specific than this local error.
          patchDiag({ callState: "ended", mic: isMicError ? "BLOCKED" : "-" });
          // Batched with setCallPhase below so the consumer's phase-transition
          // effect sees both in one render and can tell a local failure apart
          // from a real call that simply went unanswered.
          setCallFailure({ message, name: err?.name ?? null });
          setCallPhase("idle");
          throw Object.assign(new Error(message), { name: err?.name });
        });
    },
    [status, unlockAudio, patchDiag]
  );

  const hangup = useCallback(() => {
    const user = userRef.current;
    if (!user) return Promise.resolve();
    return user.hangup().catch(() => {});
  }, []);

  const toggleMute = useCallback(() => {
    const user = userRef.current;
    if (!user) return;
    if (user.isMuted()) {
      user.unmute();
      setMuted(false);
    } else {
      user.mute();
      setMuted(true);
    }
  }, []);

  const toggleHold = useCallback(() => {
    const user = userRef.current;
    if (!user) return Promise.resolve();
    return (user.isHeld() ? user.unhold() : user.hold()).catch(() => {});
  }, []);

  // Sends a real DTMF tone over the active session (RFC 2833 by default —
  // an actual signal Telnyx/the far end receives), separate from the local
  // playDtmfTone() feedback the agent hears in their own speakers.
  const sendDTMF = useCallback((tone) => {
    const user = userRef.current;
    if (!user) return Promise.resolve();
    return user.sendDTMF(tone).catch((err) => {
      logDiagError("sendDTMF failed:", err);
    });
  }, []);

  return {
    status,
    statusError,
    callPhase,
    callFailure,
    micBlocked,
    diagnostics,
    callActive: callPhase === "connected",
    muted,
    held,
    remoteAudioRef,
    call,
    hangup,
    toggleMute,
    toggleHold,
    sendDTMF,
    unlockAudio,
    retry: connect,
  };
}
