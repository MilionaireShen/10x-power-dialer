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

// Condenses an SDP body to the few lines that decide whether the browser
// can accept it. When a call dies the instant it is answered, the cause is
// almost always that the answer's media profile doesn't match what the
// browser offered — Chrome then rejects setRemoteDescription and SIP.js
// terminates the session. The transport profile on the m= line and the
// presence of a=fingerprint (DTLS-SRTP, which browsers require) versus
// a=crypto (SDES, which Chrome does not support) is what distinguishes them.
function summarizeSdp(sdp) {
  if (!sdp || typeof sdp !== "string") return "(no SDP body)";
  const audio = sdp.split(/\r?\n/).find((l) => l.startsWith("m=audio")) || "(no m=audio line)";
  const codecs = [...sdp.matchAll(/a=rtpmap:\d+\s+([A-Za-z0-9\-_/]+)/g)].map((m) => m[1].split("/")[0]);
  return [
    audio.trim(),
    `fingerprint(DTLS)=${/a=fingerprint/.test(sdp) ? "yes" : "NO"}`,
    `crypto(SDES)=${/a=crypto/.test(sdp) ? "yes" : "no"}`,
    `codecs=${[...new Set(codecs)].join(",") || "none"}`,
  ].join("  ");
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
    callerIdNumber: data.caller_id_number ?? data.caller_id ?? "",
    wsServer:
      data.ws_server ??
      data.websocket_server ??
      data.wss_uri ??
      data.sip_ws_uri ??
      import.meta.env.VITE_TELNYX_SIP_WS_SERVER ??
      DEFAULT_WS_SERVER,
  };
}

// --- RTCP multiplexing -----------------------------------------------
// Telnyx's PSTN gateway answers a WebRTC offer WITHOUT `a=rtcp-mux`, but
// SIP.js's defaultPeerConnectionConfiguration() hardcodes
// `rtcpMuxPolicy: "require"`. Chrome then rejects the 200 OK answer with
//   InvalidAccessError: Failed to set remote answer sdp: The m= section
//   with mid='0' is invalid. RTCP-MUX is not enabled when it is required.
// and SIP.js immediately ACK+BYEs the call it just answered — the call
// connects, then drops, with no audio ever flowing. Both the ringing and
// answered states flash past, which is why no call panel ever stuck.
//
// rtcpMuxPolicy:"negotiate" looks like the obvious fix but does NOT work
// here. Measured directly in Chrome 148 against an answer with the mux
// line stripped:
//   negotiate + no rtcp-mux + BUNDLE  -> InvalidAccessError
//                                        "rtcp-mux must be enabled when
//                                         BUNDLE is enabled"
//   negotiate + no rtcp-mux, no BUNDLE -> accepted
//   require   + rtcp-mux present       -> accepted
// Chrome mandates muxing whenever BUNDLE is in play irrespective of the
// policy, and the answer comes from Telnyx so we do not get to decide
// whether it carries BUNDLE. That leaves rewriting the answer as the only
// reliable fix, which is what the modifier below does.
//
// Declaring mux when the far end is not muxing costs us RTCP reporting
// (Chrome sends/expects RTCP on the RTP port; the gateway uses port+1).
// RTP — the actual voice — flows either way, so this trades a statistics
// channel for a call that connects at all.
export function forceRtcpMux(description) {
  const sdp = description.sdp || "";
  if (!sdp) return Promise.resolve(description);
  // Real SDP is CRLF-terminated. Splitting naively leaves a trailing empty
  // element, and appending the mux line after it puts an attribute past the
  // session terminator — Chrome then rejects the whole thing with
  // "Failed to parse SessionDescription". Strip the terminator, rebuild,
  // then put it back exactly as it was.
  const trailing = /\r?\n$/.exec(sdp)?.[0] ?? "";
  const lines = sdp.slice(0, sdp.length - trailing.length).split(/\r?\n/);
  const out = [];
  let inMedia = false;
  let sectionHasMux = false;
  const closeSection = () => {
    if (inMedia && !sectionHasMux) out.push("a=rtcp-mux");
  };
  for (const line of lines) {
    if (/^m=/.test(line)) {
      closeSection();
      inMedia = true;
      sectionHasMux = false;
    } else if (inMedia && /^a=rtcp-mux/.test(line)) {
      sectionHasMux = true;
    }
    out.push(line);
  }
  closeSection();
  description.sdp = out.join("\r\n") + trailing;
  return Promise.resolve(description);
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

  // Timestamped console trace of the call lifecycle. This replaced an
  // on-screen diagnostics panel once outbound audio was confirmed working;
  // the console is enough now that there is no live failure to watch, and it
  // costs nothing per call. The panel and its RTCPeerConnection stats poller
  // are in git history if a future media problem needs them back.
  const noteDiag = useCallback((label) => {
    logDiag(`[${new Date().toISOString().slice(11, 23)}] ${label}`);
  }, []);

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
            // Deliberately NOT set to the caller ID number. Doing that put
            // the number in the SIP From display name, and the terminating
            // carrier renders the display name as the caller *name* — so the
            // called party saw the number twice, once as the number and once
            // beneath it as the name.
            //
            // Sending no display name at all leaves the name field empty, so
            // the receiving carrier performs its own CNAM/LRN lookup, which
            // is what produces a city/state line where the carrier supports
            // it. A real caller name belongs in the number's CNAM listing at
            // Telnyx, not in a header set by the browser.
            displayName: undefined,
            // Surfaces SIP.js's own internal per-session state-transition
            // logs (Initial/Establishing/Established/Terminated, etc.) in
            // the console alongside the delegate-level logs below.
            logLevel: import.meta.env.DEV ? "debug" : "error",
            // SIP.js reports the reason it tears a session down through its
            // own logger — e.g. Inviter.onAccept logs the setAnswer failure
            // immediately before sending ACK+BYE(488). Routing errors into
            // the on-screen trail means that reason is visible in production
            // instead of only in a console nobody has open at the time.
            //
            // The filter is content-based, not level-based. LoggerFactory
            // calls the connector OUTSIDE its level check
            // (core/log/logger-factory.js:68) so every level arrives here,
            // but the single most important line —
            // "SessionDescriptionHandler.setDescription failed - <error>"
            // (session-description-handler.js:312) — is the only place the
            // real reason for the teardown appears, and a level-only filter
            // was dropping the surrounding context needed to interpret it.
            logConnector: (level, category, label, content) => {
              const text = String(content);
              const isFailure = /fail|error|reject|invalid|unable|terminat/i.test(text);
              const isLifecycle = /Inviter|SessionDescriptionHandler|setDescription|Transport/i.test(category + text);
              if (level === "error" || level === "warn" || isFailure || isLifecycle) {
                noteDiag(`${level}|${category.replace(/^sip\./, "")}: ${text.slice(0, 400)}`);
              }
              void label;
            },
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
              user
                .answer({
                  sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
                  // Same rtcp-mux guard as the outbound path — an inbound
                  // offer that omits it would otherwise be rejected too.
                  sessionDescriptionHandlerModifiers: [forceRtcpMux],
                })
                .catch((err) => {
                  logDiagError("event: onCallReceived — answer() failed:", err);
                  setStatusError("Could not answer the incoming call.");
                  setCallPhase("idle");
                });
            },
            onCallAnswered: () => {
              noteDiag("call answered (200 OK)");
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
              verifyRemoteAudioElement(remoteAudioRef.current, "onCallAnswered");
            },
            onCallHangup: () => {
              noteDiag("call ended (BYE)");
              stopRingback();
              setCallPhase("idle");
              setMuted(false);
              setHeld(false);
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

      const target = destinationForNumber(number, domainRef.current);
      logDiag("placing call to", target);

      return user
        .call(
          target,
          // inviterOptions — Inviter stores these modifiers and applies them
          // to the 200 OK answer SDP (inviter.js:895) right before
          // setRemoteDescription, which is exactly where the rtcp-mux
          // rejection happens. See the RTCP block at the top of this file.
          { sessionDescriptionHandlerModifiers: [forceRtcpMux] },
          {
            requestDelegate: {
              // 180 Ringing / 183 Session Progress — the destination is
              // genuinely being alerted. This is the only point at which a
              // local ringback tone is honest.
              onProgress: (response) => {
                const code = response?.message?.statusCode;
                noteDiag(`SIP ${sipReasonFor(code, response?.message?.reasonPhrase)}`);
                // 183 usually carries early media (real ringback from the
                // carrier); generating our own on top would double it.
                if (code === 180) startRingback();
              },
              // NOTE ON ORDERING: SIP.js calls this delegate only after its
              // own Inviter.onAccept() has finished (inviter.js ~line 572),
              // and that is where the answer SDP is applied. So if the
              // answer cannot be applied, the ACK+BYE(488) is already sent
              // by the time this runs — which is why "call ended" can appear
              // in the trail a few milliseconds BEFORE "200 answered". The
              // ordering is a logging artifact, not a race in this code.
              onAccept: (response) => {
                noteDiag(`SIP ${response?.message?.statusCode} answered`);
                noteDiag(`answer SDP: ${summarizeSdp(response?.message?.body)}`);
                stopRingback();
              },
              // A rejected INVITE previously surfaced only as a generic
              // failure, so "no ringback, nothing happened" gave no clue
              // that the carrier had actively refused the call.
              onReject: (response) => {
                const code = response?.message?.statusCode;
                const phrase = response?.message?.reasonPhrase;
                const reason = sipReasonFor(code, phrase);
                noteDiag(`REJECTED ${reason}`);
                logDiagError("INVITE rejected:", reason);
                stopRingback();
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
          // Batched with setCallPhase below so the consumer's phase-transition
          // effect sees both in one render and can tell a local failure apart
          // from a real call that simply went unanswered.
          setCallFailure({ message, name: err?.name ?? null });
          setCallPhase("idle");
          throw Object.assign(new Error(message), { name: err?.name });
        });
    },
    [status, unlockAudio, noteDiag]
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
    // Read-only accessors onto the streams the SIP session already owns.
    // Exposed for call recording, which needs BOTH: the local track carries
    // only the agent, and the customer exists solely on the remote stream.
    // Getters rather than state so they always reflect the current session
    // without adding a re-render path into the call machinery.
    get localMediaStream() {
      return userRef.current?.localMediaStream ?? null;
    },
    get remoteMediaStream() {
      return userRef.current?.remoteMediaStream ?? null;
    },
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
