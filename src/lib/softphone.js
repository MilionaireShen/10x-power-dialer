import { useCallback, useEffect, useRef, useState } from "react";
import { Web } from "sip.js";
import agentService from "../services/agentService";

const { SimpleUser } = Web;

// Telnyx's public WebRTC-over-SIP signaling endpoint — used only as a
// fallback when GET /agent/sip-token doesn't return its own ws_server.
// Override with VITE_TELNYX_SIP_WS_SERVER if this account uses a
// different one.
const DEFAULT_WS_SERVER = "wss://sip.telnyx.com:7443";
const DEFAULT_DOMAIN = "sip.telnyx.com";

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

/**
 * WebRTC softphone backed by SIP.js's SimpleUser, registered against
 * Telnyx using the credentials from GET /agent/sip-token. Handles
 * incoming call legs (auto-answered — this is a call-center dialer, the
 * platform decides who gets bridged to an agent, not the agent), and
 * exposes mute/hold/hangup/call bound to the one real concurrent session
 * SimpleUser supports.
 */
export function useSoftphone({ enabled }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | registered | unregistered | disconnected | failed
  const [statusError, setStatusError] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);

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

    agentService
      .getSipToken()
      .then((res) => {
        const creds = normalizeSipCredentials(res.data || {});
        domainRef.current = creds.domain;
        if (!creds.username || !creds.password) {
          throw new Error("Softphone credentials were not returned by the server.");
        }

        const user = new SimpleUser(creds.wsServer, {
          aor: `sip:${creds.username}@${creds.domain}`,
          media: { remote: { audio: remoteAudioRef.current ?? undefined } },
          userAgentOptions: {
            authorizationUsername: creds.username,
            authorizationPassword: creds.password,
          },
          delegate: {
            onServerConnect: () => setStatus((s) => (s === "registered" ? s : "connecting")),
            onServerDisconnect: (error) => {
              setStatus("disconnected");
              if (error) setStatusError(error.message || "Connection to the phone server was lost.");
            },
            onRegistered: () => {
              setStatus("registered");
              setStatusError(null);
            },
            onUnregistered: () => setStatus((s) => (s === "failed" ? s : "unregistered")),
            // Incoming call leg from the dialer/ACD — auto-answer, since
            // the agent already signaled availability by being logged in
            // and the platform (not the agent) decides who gets bridged.
            onCallReceived: () => {
              user.answer({ sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } } }).catch(() => {
                setStatusError("Could not answer the incoming call.");
              });
            },
            onCallAnswered: () => {
              setCallActive(true);
              setMuted(false);
              setHeld(false);
            },
            onCallHangup: () => {
              setCallActive(false);
              setMuted(false);
              setHeld(false);
            },
            onCallHold: (isHeld) => setHeld(isHeld),
          },
        });

        userRef.current = user;
        return user.connect().then(() => user.register());
      })
      .catch((err) => {
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

  const call = useCallback(
    (number) => {
      const user = userRef.current;
      if (!user || status !== "registered") {
        return Promise.reject(new Error("Softphone is not registered yet."));
      }
      return user.call(destinationForNumber(number, domainRef.current));
    },
    [status]
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

  return {
    status,
    statusError,
    callActive,
    muted,
    held,
    remoteAudioRef,
    call,
    hangup,
    toggleMute,
    toggleHold,
    retry: connect,
  };
}
