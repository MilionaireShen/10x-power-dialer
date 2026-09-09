import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Mic, MicOff, Pause, Play, PhoneOff, Phone, PhoneCall, ChevronDown, Check, MapPin, CalendarDays, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useAppData } from "../lib/AppDataContext";
import { useAgentLiveState } from "../lib/useAgentLiveState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";
import StatusPill from "../components/StatusPill";
import SidePanel from "../components/SidePanel";
import AgentStatsPanel from "../components/AgentStatsPanel";
import AgentLeaderboardPanel from "../components/AgentLeaderboardPanel";
import CallbackScheduler from "../components/CallbackScheduler";
import CallbackPopup from "../components/CallbackPopup";
import AvailabilityPanel from "../components/AvailabilityPanel";
import HotkeyBar from "../components/HotkeyBar";
import SessionEndedOverlay from "../components/SessionEndedOverlay";
import dispositionService from "../services/dispositionService";
import { formatDuration, wrapUpVisual, getStatusVisual } from "../lib/statusColors";
import { openPropertyOnMap } from "../lib/googleMaps";
import { extractAreaCode } from "../lib/didReputationEngine";
import { matchesBinding } from "../lib/hotkeys";
import campaignService from "../services/campaignService";
import smsService from "../services/smsService";
import SmsConversation from "../components/SmsConversation";
import EmailComposer from "../components/EmailComposer";
import CommunicationPanel from "../components/CommunicationPanel";
import CustomerInfoFields from "../components/CustomerInfoFields";
import hotkeyService from "../services/hotkeyService";
import scriptService from "../services/scriptService";
import agentService from "../services/agentService";
import callService from "../services/callService";
import dialerService from "../services/dialerService";
import leadService from "../services/leadService";
import reportService from "../services/reportService";
import { playDtmfTone, addedDtmfDigits } from "../lib/dtmf";

// The dispositions table is seeded with slugs that don't exactly match this
// frontend's DISPOSITIONS[].key values (e.g. "booked_appointment" vs
// "booked") — this reconciles a hotkey's joined disposition name to the
// key the rest of this screen already switches on.
const DISPOSITION_NAME_MAP = {
  booked_appointment: "booked",
  callback: "callback",
  not_interested: "not_interested",
  no_answer: "no_answer",
  voicemail_left: "voicemail",
  wrong_number: "wrong_number",
  do_not_call: "dnc",
  follow_up: "follow_up",
};

// The reverse of the map above — a hotkey press hands submitDisposition()
// one of these screen-local keys (e.g. "booked"), but the backend's
// dispositions table (and POST /calls/:id/disposition) only knows the real
// name (e.g. "booked_appointment"). A direct click on a WrapupState
// disposition button already passes the real name straight through
// (dispositions[].key is d.name from the API), so this lookup is a no-op
// for that path — only hotkey-sourced keys are actually remapped.
const REVERSE_DISPOSITION_MAP = Object.fromEntries(
  Object.entries(DISPOSITION_NAME_MAP).map(([dbName, localKey]) => [localKey, dbName])
);

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_OPTIONS = [
  { key: "available", label: "Available" },
  { key: "unready", label: "Unready" },
  { key: "lunch", label: "Lunch" },
  { key: "break", label: "Break" },
  { key: "manual_dial", label: "Manual Dial", icon: Phone },
];

function buildEmptyLead() {
  return {
    fullName: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    timezone: "",
    timesCalled: 0,
    lastDisposition: "—",
    notes: "",
    customValues: {},
  };
}

function buildManualDialLead(phone) {
  return {
    fullName: "Manual Dial Contact",
    phone,
    email: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    timezone: "",
    timesCalled: 0,
    lastDisposition: "—",
    notes: "Manually dialed — no prior lead history on file.",
    customValues: {},
  };
}

// Turns the backend's hydrated-lead payload (GET /admin/leads/lookup or
// GET /agent/current-call) into the flat shape this screen's panels read.
// The lead's real id is carried through so a disposition, SMS or booked
// appointment attaches to the actual lead record and its history — and
// campaign/lead-list context is shown without ever being written back.
function mapLeadFromApi(payload) {
  const l = payload?.lead;
  if (!l) return null;
  const cf = l.custom_fields || {};
  return {
    id: l.id,
    fullName: [l.first_name, l.last_name].filter(Boolean).join(" ") || "Unknown Contact",
    phone: l.phone_number || "",
    email: l.email || "",
    street: l.street_address || "",
    city: l.city || "",
    state: l.state || "",
    zip: l.zip_code || "",
    timezone: l.timezone || "",
    timesCalled: l.times_called ?? (payload.calls?.length || 0),
    lastDisposition: l.last_disposition || "—",
    notes: cf.notes || cf.note || "",
    customValues: cf,
    // Vacation-campaign fields — null on roofing leads, which never display them.
    age: l.age ?? null,
    lastTravelDate: l.last_travel_date || "",
    lastTravelDestination: l.last_travel_destination || "",
    status: l.status || null,
    campaignId: l.campaign_id || null,
    campaignName: l.campaign?.name || null,
    leadListName: l.lead_list?.name || null,
    isDnc: Boolean(l.is_dnc || payload.dnc),
    history: {
      calls: payload.calls || [],
      conversations: payload.conversations || [],
      appointments: payload.appointments || [],
    },
  };
}

// The human-readable line the agent sees while no call is in progress.
// Driven entirely by what the backend dialing engine reports — never a
// client-side guess or timer.
function dialerWaitingMessage(dialerState) {
  if (!dialerState) {
    return { title: "Checking campaign status…", hint: "Contacting the dialer.", tone: "info" };
  }
  const s = dialerState.state;
  if (s === "running") {
    return { title: "Campaign Running", hint: "You'll be connected automatically once the dialer has a call for you.", tone: "info" };
  }
  if (s === "waiting_for_agent") {
    return { title: "Campaign Running", hint: "Waiting for an available agent slot — stay on Available.", tone: "info" };
  }
  if (s === "exhausted") {
    return { title: "No Eligible Leads", hint: "Every lead in this campaign has been dialed or is not currently callable.", tone: "warning" };
  }
  if (s === "paused") {
    return { title: "Campaign Paused", hint: "A manager has paused this campaign's dialer.", tone: "warning" };
  }
  if (s === "not_started") {
    return { title: "Waiting for Campaign to Start", hint: "The dialer is ready but hasn't been started by a manager yet.", tone: "neutral" };
  }
  if (typeof s === "string" && s.startsWith("blocked_")) {
    const reason = dialerState.blocked_reason || "";
    if (s === "blocked_funds_ok") return { title: "Telephony Error", hint: reason, tone: "danger" };
    if (s === "blocked_has_usable_did" || s === "blocked_telephony_configured") {
      return { title: "Telephony Error", hint: reason, tone: "danger" };
    }
    if (s === "blocked_has_pending_leads") return { title: "No Eligible Leads", hint: reason, tone: "warning" };
    if (s === "blocked_within_calling_hours") return { title: "Outside Calling Hours", hint: reason, tone: "warning" };
    return { title: "Campaign Configuration Required", hint: reason, tone: "danger" };
  }
  return { title: "Waiting for Campaign to Start", hint: "You'll be connected automatically once the dialer has a call for you.", tone: "neutral" };
}

export default function AgentDashboard() {
  const { user, activeCampaignId, sessionId, logout } = useAuth();
  const { phoneNumbers, selectBestDID, markDIDInUse } = useAppData();

  // Clients are read from the API rather than a shared context: the booking
  // panel needs the client's calendar link, and the campaign points at its
  // client by id.
  const [clients, setClients] = useState([]);
  const [myCallbacks, setMyCallbacks] = useState([]);

  const refreshMyCallbacks = useCallback(
    () =>
      adminService
        .listCallbacks({ page_size: 20 })
        .then((r) => setMyCallbacks(r?.data?.callbacks || []))
        .catch(() => {}),
    []
  );

  useEffect(() => {
    adminService.listClients().then((r) => setClients(r?.data?.clients || [])).catch(() => {});
    refreshMyCallbacks();
  }, [refreshMyCallbacks]);
  const { notify } = useToast();
  const navigate = useNavigate();
  // The softphone (SIP.js, registered against Telnyx) is instantiated once
  // in AppLayout's AgentShell — not here — so registration survives across
  // whichever agent page/panel is mounted; callState below just mirrors it.
  const { sidebarOpen, openPanel, closePanel, softphone, recording } = useOutletContext();

  // Real campaign record (name, wrap-up limit, SMS config, assigned
  // script) rather than the AppDataContext mock list — falls back to the
  // company's first campaign only for a non-agent role previewing this
  // screen with no campaign selected.
  const [campaign, setCampaign] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (activeCampaignId) {
          const res = await campaignService.get(activeCampaignId);
          if (!cancelled) setCampaign(res.data);
        } else {
          const res = await campaignService.list();
          if (!cancelled) setCampaign(res.data?.[0] ?? null);
        }
      } catch {
        if (!cancelled) setCampaign(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCampaignId]);

  // The client (and therefore which calendar to show) is derived entirely
  // from the lead's campaign — the agent never picks it themselves.
  // A campaign carries its client's id, so the client is looked up by that
  // rather than by scanning each client's list of campaigns.
  const resolvedClient = clients.find((c) => c.id === campaign?.client_id) ?? null;
  const wrapUpLimit = campaign?.wrapup_time_seconds ?? 60;

  const [hotkeys, setHotkeys] = useState([]);
  useEffect(() => {
    if (!campaign?.id) {
      setHotkeys([]);
      return;
    }
    let cancelled = false;
    hotkeyService
      .getForCampaign(campaign.id)
      .then((res) => {
        if (cancelled) return;
        setHotkeys(
          (res.data || []).map((h) => ({
            id: h.id,
            keyBinding: h.key_binding,
            dispositionKey: DISPOSITION_NAME_MAP[h.dispositions?.name] || h.dispositions?.name,
            label: h.label,
            color: h.color,
            active: h.is_active,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setHotkeys([]);
      });
    return () => {
      cancelled = true;
    };
  }, [campaign?.id]);

  const [script, setScript] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  useEffect(() => {
    if (!campaign?.id) {
      setScript(null);
      setScriptLoaded(true);
      return;
    }
    let cancelled = false;
    setScriptLoaded(false);
    scriptService
      .getForCampaign(campaign.id)
      .then((res) => {
        if (!cancelled) setScript(res.data);
      })
      .catch(() => {
        if (!cancelled) setScript(null);
      })
      .finally(() => {
        if (!cancelled) setScriptLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [campaign?.id]);

  // The admin-configured Customer Information field layout for this
  // campaign (labels + order + which lead fields to show). Loaded once
  // per campaign, exactly like the script above — not tied to a call.
  const [leadFieldConfig, setLeadFieldConfig] = useState([]);
  useEffect(() => {
    if (!campaign?.id) { setLeadFieldConfig([]); return; }
    let cancelled = false;
    agentService
      .leadFields(campaign.id)
      .then((res) => { if (!cancelled) setLeadFieldConfig(res?.data?.fields || []); })
      .catch(() => { if (!cancelled) setLeadFieldConfig([]); });
    return () => { cancelled = true; };
  }, [campaign?.id]);

  const [status, setStatus] = useState("available");
  const [statusSince, setStatusSince] = useState(Date.now());
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const [callState, setCallState] = useState("waiting"); // waiting | ringing | connected | wrapup
  // Live state of this campaign's dialing engine (GET /dialer/status) —
  // what the "waiting" screen shows instead of a static placeholder.
  const [dialerState, setDialerState] = useState(null);
  // This agent's Parallel Dials setting + the company's ceiling, and how
  // many of their current batch are still actively ringing right now —
  // the numbers behind the Parallel Dials dropdown and the "N active
  // dials" indicator beside the phone icon.
  const [parallelSettings, setParallelSettings] = useState({ parallel_dials: 1, max_parallel_dials: 5, parallel_dialing_enabled: false });
  const [parallelStatus, setParallelStatus] = useState({ active: false, active_calls: 0, requested_count: 0 });
  const [callSeconds, setCallSeconds] = useState(0);
  const [wrapSeconds, setWrapSeconds] = useState(0);
  const [disposition, setDisposition] = useState(null);
  const [notes, setNotes] = useState("");

  // The dispositions an agent may pick, from the database. Admins add and
  // rename these, so a fixed list in the frontend would drift from what the
  // reports are actually grouped by.
  const [dispositions, setDispositions] = useState([]);
  useEffect(() => {
    dispositionService
      .list()
      .then((res) => setDispositions((res?.data || []).map((d) => ({
        key: d.name,
        label: d.label || d.name,
        color: d.color || "#6B7280",
      }))))
      .catch(() => setDispositions([]));
  }, []);

  const [lead, setLead] = useState(buildEmptyLead);
  // The backend call row for the call in progress, so an appointment booked
  // during it can be linked back to the recording and call history.
  const [activeCallId, setActiveCallId] = useState(null);
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsNote, setSmsNote] = useState("");
  const [manualDialNumber, setManualDialNumber] = useState("");
  const [dialedNumber, setDialedNumber] = useState("");
  const [dialing, setDialing] = useState(false);
  const [dtmfInput, setDtmfInput] = useState("");
  const [isManualCall, setIsManualCall] = useState(false);
  // The DID Reputation Engine — never chosen by the agent. selectBestDID()
  // picks it the instant a call connects. The outcome is not reported back
  // from here: the score is recalculated server-side from the calls table,
  // which already records how this call went.
  const [activeDIDId, setActiveDIDId] = useState(null);
  const [flashKey, setFlashKey] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [scheduledCallbackAt, setScheduledCallbackAt] = useState(null);

  const [statsToday, setStatsToday] = useState({
    calls: 0,
    connects: 0,
    booked: 0,
    notInterested: 0,
    noAnswers: 0,
    goal: 80,
    avgDurationSeconds: 0,
  });
  const [leaderboardData, setLeaderboardData] = useState({ myRank: "—", top3: [] });
  const [sessionSummary, setSessionSummary] = useState(null);
  const [autoLogoutCount, setAutoLogoutCount] = useState(0);
  const loginTimeRef = useRef(Date.now());
  const [nowTick, setNowTick] = useState(Date.now());
  const chimePlayedRef = useRef(false);

  // Live "time logged in" tick — only runs while the stats panel is open.
  useEffect(() => {
    if (openPanel !== "dashboard") return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [openPanel]);

  // Pulls today's real call stats for this agent — reflects only calls the
  // backend actually has a record of, so a freshly created account shows
  // real zeros here rather than seeded demo numbers.
  const refreshStats = useCallback(async () => {
    try {
      const todayStr = todayDateStr();
      const res = await reportService.agentPerformance({ agent_id: user.id, date_from: todayStr, date_to: todayStr });
      const row = res.data?.[0];
      const breakdown = row?.dispositions_breakdown || {};
      setStatsToday((s) => ({
        ...s,
        calls: row?.total_calls ?? 0,
        connects: row?.connects ?? 0,
        // Keyed by the disposition's `name` (slug) — calls.disposition
        // stores that, not the display label, matching every other place a
        // disposition is referenced (hotkeys included).
        booked: breakdown["booked_appointment"] ?? 0,
        notInterested: breakdown["not_interested"] ?? 0,
        noAnswers: breakdown["no_answer"] ?? 0,
        avgDurationSeconds: row?.avg_call_duration_seconds ?? 0,
      }));
    } catch {
      // leave the last known values on screen rather than blanking them
    }
  }, [user.id]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // When the loaded lead changes (preview Next, a new progressive call, a
  // fresh manual dial, or the lead being cleared after wrap-up) drop any
  // open communication drawer and its "sent" flag. The composers are also
  // keyed by lead.id so they remount clean — together this guarantees the
  // previous lead's recipient/draft can never carry into the next lead.
  const leadId = lead?.id || null;
  useEffect(() => {
    setSmsOpen(false);
    setEmailOpen(false);
    setSmsSent(false);
    setSmsNote("");
  }, [leadId]);

  // Company-wide leaderboard, scoped to today and (when known) this
  // campaign — unlike the other report endpoints this one intentionally
  // isn't restricted to the caller's own data, so an agent can see where
  // they rank against teammates.
  useEffect(() => {
    let cancelled = false;
    reportService
      .leaderboard({ date_from: todayDateStr(), date_to: todayDateStr(), campaign_id: campaign?.id })
      .then((res) => {
        if (cancelled) return;
        const rows = res.data || [];
        const mine = rows.find((r) => r.agent_id === user.id);
        setLeaderboardData({
          myRank: mine?.rank ?? "—",
          top3: rows.slice(0, 3).map((r) => ({ name: r.agent_name, firstName: r.agent_name.split(" ")[0], booked: r.booked })),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [campaign?.id, user.id]);

  // Real session summary (GET /agent/session/:id/summary) for "time logged
  // in" — polled while the stats panel is open rather than derived from a
  // client-side timestamp.
  useEffect(() => {
    if (openPanel !== "dashboard" || !sessionId) return;
    let cancelled = false;
    const load = () =>
      agentService
        .getSessionSummary(sessionId)
        .then((res) => {
          // Stamp the fetch time so the display can tick the current
          // session forward smoothly between 15s polls, then re-sync to
          // the backend total (which is the source of truth) on the next.
          if (!cancelled) setSessionSummary({ ...res.data, _fetchedAtMs: Date.now() });
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [openPanel, sessionId]);

  useEffect(() => {
    if (callState !== "connected") return;
    const id = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callState]);

  // Bridges the softphone's real call phase into this screen's own
  // waiting/ringing/connected/wrapup machine — an outbound Manual Dial
  // call (or an incoming leg auto-answered by the softphone) flips this to
  // "ringing" then "connected"; the call ending, whichever side hangs up
  // and whether or not it was ever answered, flips it to "wrapup" exactly
  // like a manual End Call click would (so an unanswered dial still gets a
  // disposition, e.g. "No Answer").
  const prevPhaseRef = useRef("idle");
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const phase = softphone.callPhase;
    prevPhaseRef.current = phase;
    if (phase === prevPhase) return;

    if (phase === "ringing") {
      setCallState("ringing");
    } else if (phase === "connected") {
      notify("Call connected.", "info");
      setCallState("connected");
      setCallSeconds(0);
      setDtmfInput("");
      setSmsOpen(false);
      setSmsSent(false);
      setSmsNote("");
    } else if (phase === "idle" && (prevPhase === "ringing" || prevPhase === "connected")) {
      // A dial that died locally (mic blocked, no device) never put an
      // INVITE on the wire, so there is no call to disposition — drop the
      // agent back on the dial pad instead of trapping them in a wrap-up
      // countdown for a call that never happened. A real call that rang
      // and went unanswered still goes to wrap-up so it can be logged.
      const failedBeforeConnecting = prevPhase === "ringing" && softphone.callFailure;
      setCallState((cs) => {
        if (cs !== "ringing" && cs !== "connected") return cs;
        return failedBeforeConnecting ? "waiting" : "wrapup";
      });
      setWrapSeconds(0);
      setDtmfInput("");
      setDialedNumber("");
      setDisposition(null);
      setNotes("");
      setSmsOpen(false);
      setScheduledCallbackAt(null);
    }
  }, [softphone.callPhase, softphone.callFailure, notify]);

  // Whether the call was answered or the dial attempt failed/was rejected,
  // the local "dialing" flag (used just to disable the Dial button for the
  // one render before the screen swaps to RingingState) is done either way.
  useEffect(() => {
    setDialing(false);
  }, [softphone.callPhase]);

  useEffect(() => {
    if (callState !== "wrapup" || sessionEnded) {
      chimePlayedRef.current = false;
      return;
    }
    const id = setInterval(() => setWrapSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callState, sessionEnded]);

  // Reacts to the tick above rather than nesting these setState calls inside
  // setWrapSeconds's updater — updater functions must stay pure, and calling
  // another component's setter from inside one trips React's "setState while
  // rendering a different component" warning.
  useEffect(() => {
    if (callState !== "wrapup" || sessionEnded) return;
    const yellowAt = Math.round(wrapUpLimit * 0.75);
    if (wrapSeconds === yellowAt && !chimePlayedRef.current) {
      chimePlayedRef.current = true;
      notify("Wrap-up entering yellow zone — audio chime played.", "warning", { title: "Wrap-Up Warning" });
    }
    // Force-logout fires the instant the countdown hits 0:00 — no grace
    // period — and blocks the screen with SessionEndedOverlay instead of
    // silently resetting status in place.
    if (wrapSeconds >= wrapUpLimit) {
      setAutoLogoutCount((c) => c + 1);
      // The session row records the reason server-side when the session is
      // closed; this local key only drives the overlay's wording.
      localStorage.setItem("logout_reason", "wrapup_timeout");
      setSessionEnded(true);
    }
  }, [wrapSeconds, callState, sessionEnded, notify, user.name, wrapUpLimit]);

  // Supervisor actions and due callbacks arrive from the server. They used to
  // come from a React context shared with the admin screens, which only
  // delivered anything when both were open in the same browser tab.
  const handleForcedStatus = useCallback(
    (status) => {
      setStatus(status);
      setStatusSince(Date.now());
      notify(`An administrator changed your status to "${status}".`, "warning", { title: "Status Changed by Admin" });
    },
    [notify]
  );

  const handleForcedLogout = useCallback(
    (reason) => {
      notify("You were logged out by an administrator.", "error", { title: "Force Logout" });
      localStorage.setItem("logout_reason", reason || "admin_kick");
      logout();
      navigate("/agent/login");
    },
    [notify, logout, navigate]
  );

  const handleIncomingMessage = useCallback(
    (m) => notify(m.body, "info", { title: `Message from ${m.from_name || "your supervisor"}` }),
    [notify]
  );

  const { dueCallback, resolveCallback, dismissCallbackPopup, noteOwnStatusChange } = useAgentLiveState({
    enabled: !sessionEnded,
    onMessage: handleIncomingMessage,
    onForcedStatus: handleForcedStatus,
    onForcedLogout: handleForcedLogout,
  });

  // Presence heartbeat. While the dialer is open this pings the backend every
  // 20s; the Agent Monitor counts this session as online only for as long as
  // the pings keep coming. When the tab closes they stop and the backend
  // reaper takes the agent offline — so "online" reflects a real connection,
  // not a row that was never cleaned up.
  useEffect(() => {
    if (sessionEnded) return undefined;
    agentService.heartbeat().catch(() => {});
    const id = setInterval(() => agentService.heartbeat().catch(() => {}), 20000);
    return () => clearInterval(id);
  }, [sessionEnded]);

  // Poll the real dialing-engine state while the agent is between calls and
  // NOT in manual-dial mode. This is what replaces the old static
  // "Waiting for campaign to start..." text with the engine's actual state
  // (running / waiting for agent / no leads / paused / blocked + reason).
  useEffect(() => {
    const campaignId = activeCampaignId || campaign?.id;
    if (sessionEnded || !campaignId || callState !== "waiting" || status === "manual_dial") {
      return undefined;
    }
    let cancelled = false;
    const load = () =>
      dialerService
        .status(campaignId)
        .then((res) => {
          if (!cancelled) setDialerState(res.data);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeCampaignId, campaign?.id, callState, status, sessionEnded]);

  // This agent's Parallel Dials setting + the company's ceiling — loaded
  // once (it changes rarely, and setParallelDialsOption below keeps this
  // state in sync with anything the agent actually changes).
  useEffect(() => {
    let cancelled = false;
    agentService
      .getParallelDials()
      .then((res) => {
        if (!cancelled && res?.data) setParallelSettings(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Live count of this agent's currently-ringing parallel legs — the
  // number the "N active dials" indicator shows. Polled quickly (2s) since
  // this is exactly the figure meant to visibly move as legs resolve.
  useEffect(() => {
    if (sessionEnded || !parallelSettings.parallel_dialing_enabled || campaign?.dialing_mode !== "parallel") return undefined;
    if (callState !== "waiting" || status === "manual_dial") {
      setParallelStatus({ active: false, active_calls: 0, requested_count: 0 });
      return undefined;
    }
    let cancelled = false;
    const load = () =>
      agentService
        .getParallelStatus()
        .then((res) => {
          if (!cancelled && res?.data) setParallelStatus(res.data);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionEnded, callState, status, parallelSettings.parallel_dialing_enabled, campaign?.dialing_mode]);

  const handleParallelDialsChange = (n) => {
    const prev = parallelSettings.parallel_dials;
    setParallelSettings((s) => ({ ...s, parallel_dials: n }));
    agentService.setParallelDials(n).catch((err) => {
      setParallelSettings((s) => ({ ...s, parallel_dials: prev }));
      notify(err?.message || "Could not save your Parallel Dials setting.", "error");
    });
  };

  // Poll for the dialer call this agent is currently on / being rung for, so
  // a progressive-campaign call arrives with the real lead (name, address,
  // history) already on screen. The softphone only carries audio — it never
  // says who is being called. Manual calls are skipped here: handleDial
  // already set that lead from the number the agent typed.
  useEffect(() => {
    if (sessionEnded || isManualCall) return undefined;
    if (callState === "wrapup") return undefined;
    let cancelled = false;
    const load = () =>
      agentService
        .currentCall()
        .then((res) => {
          if (cancelled) return;
          const payload = res?.data;
          const call = payload?.call;
          if (!call || call.call_type === "manual") return;
          // The server's active call is the one to attach SMS / bookings to.
          setActiveCallId(call.id);
          const mapped = mapLeadFromApi(payload);
          if (mapped) {
            setLead((prev) => (prev?.id === mapped.id ? prev : mapped));
          }
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionEnded, isManualCall, callState]);

  // One-time sync of this agent's status from the server session on mount,
  // so a status a supervisor set (or a reload mid-shift) is reflected rather
  // than always starting at "available".
  useEffect(() => {
    let cancelled = false;
    agentService
      .heartbeat()
      .then((res) => {
        const serverStatus = res?.data?.status;
        if (!cancelled && serverStatus && serverStatus !== "logged_out") {
          setStatus(serverStatus);
          noteOwnStatusChange(serverStatus);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = (key) => {
    setStatus(key);
    setStatusSince(Date.now());
    setStatusMenuOpen(false);
    // Recorded locally first so the next poll does not read this agent's own
    // change as one a supervisor made.
    noteOwnStatusChange(key);
    agentService.changeStatus(key).catch(() => {});
  };

  // Plays a local touch-tone for each newly typed digit — backspace/clear
  // never do (addedDtmfDigits returns "" for those). No live call exists
  // yet at this point, so there's nothing to send real DTMF to.
  const handleManualDialNumberChange = (next) => {
    for (const digit of addedDtmfDigits(manualDialNumber, next)) playDtmfTone(digit);
    setManualDialNumber(next);
  };

  // Same local tone as above, but this one's typed during a live call, so
  // each digit also goes out as real DTMF over the SIP session (e.g. an
  // IVR menu on the far end), not just played back locally.
  const handleDtmfInputChange = (next) => {
    for (const digit of addedDtmfDigits(dtmfInput, next)) {
      playDtmfTone(digit);
      softphone.sendDTMF(digit);
    }
    setDtmfInput(next);
  };

  const handleDial = () => {
    const trimmed = manualDialNumber.trim();
    if (!trimmed) {
      notify("Enter a phone number to dial.", "warning");
      return;
    }
    if (softphone.status !== "registered") {
      notify("Softphone is not registered yet — please wait a moment and try again.", "warning");
      return;
    }
    // Show a placeholder immediately, then look the number up against the
    // lead database. If it already belongs to a lead, swap in that lead's
    // full record (name, address, campaign, history) — matched on the
    // server-normalised phone number so any format the agent types resolves.
    // Never creates a lead, and never changes the matched lead's campaign.
    setLead(buildManualDialLead(trimmed));
    leadService
      .lookupByPhone(trimmed)
      .then((res) => {
        const mapped = mapLeadFromApi(res?.data);
        if (mapped) {
          setLead(mapped);
          notify(
            `Existing lead found: ${mapped.fullName}${mapped.campaignName ? ` · ${mapped.campaignName}` : ""}`,
            "info",
            { title: "Lead Recognised" }
          );
        }
      })
      .catch(() => {
        // Lookup is best-effort — the dial still goes out with the placeholder.
      });
    setIsManualCall(true);
    const bestDID = selectBestDID(campaign?.id, extractAreaCode(trimmed));
    if (bestDID) {
      setActiveDIDId(bestDID.id);
      markDIDInUse(bestDID.id);
    } else {
      setActiveDIDId(null);
    }
    setDialedNumber(trimmed);
    setManualDialNumber("");
    setDialing(true);

    // Declares the call to the backend before the INVITE goes out, so it lands
    // with an agent and campaign on it. The Telnyx webhook, which is otherwise
    // the only record of a browser-originated call, carries nothing that
    // identifies the agent — it claims this row instead of creating an
    // unattributed one. Best-effort: a failure here must not block the call.
    callService
      .manual(trimmed)
      .then((res) => {
        const callId = res?.data?.id;
        if (callId) {
          setActiveCallId(callId);
          recording?.setCallContext?.({ callId, toNumber: trimmed, direction: "outbound" });
        }
      })
      .catch((err) => {
        console.warn("[dialer] could not declare manual call:", err?.message || err);
      });
    // The screen doesn't flip to "connected" here — the softphone bridge
    // effect above does that once onCallAnswered actually fires (moving
    // through "ringing" first), so this waits for the real call the same
    // way an incoming leg does.
    softphone.call(trimmed).catch((err) => {
      notify(err?.message || "Could not place the call.", "error");
    });
  };

  // Preview Dialing — the lead the agent is currently reviewing (not yet
  // dialed), and the DIAL/NEXT actions on it. Deliberately separate from
  // `lead`/`activeCallId` above: those represent a real call in progress
  // (populated by the existing agent/current-call poll below once one
  // exists), while this is the pre-dial review step that spec explicitly
  // requires never create a call or count as an attempt.
  const [previewLead, setPreviewLead] = useState(null);
  const [previewMessage, setPreviewMessage] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDialing, setPreviewDialing] = useState(false);
  const isPreviewMode = campaign?.dialing_mode === "preview";

  const loadPreviewLead = useCallback(
    (skipLeadId) => {
      if (!campaign?.id) return;
      setPreviewLoading(true);
      dialerService
        .previewNext(campaign.id, skipLeadId)
        .then((res) => {
          const mapped = mapLeadFromApi(res?.data?.history);
          setPreviewLead(mapped);
          setPreviewMessage(mapped ? null : res?.data?.message || "No more leads available.");
          if (mapped) setLead(mapped); // let the script panel's merge fields show the real lead while reviewing
        })
        .catch((err) => {
          setPreviewLead(null);
          setPreviewMessage(err?.message || "Could not load the next lead.");
        })
        .finally(() => setPreviewLoading(false));
    },
    [campaign?.id]
  );

  // Fetches once when Preview becomes the relevant thing to show — not
  // polled, since the reservation stays valid until the agent acts and
  // re-fetching on a timer would just be noise (and risk clobbering an
  // in-flight review with a duplicate reservation). The backend decides
  // whether a lead comes back or a "paused"/"no more leads" message —
  // preview needs no manager Start, so there's nothing to gate on here.
  useEffect(() => {
    if (!isPreviewMode || status === "manual_dial" || callState !== "waiting") return;
    loadPreviewLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode, status, callState, campaign?.id]);

  // A dial attempt (successful or not) always ends the review step — reset
  // so the next time "waiting" is reached (a fresh lead, or back from a
  // completed call) starts clean rather than re-showing a stale flag.
  useEffect(() => {
    setPreviewDialing(false);
  }, [callState]);

  const handlePreviewNext = () => {
    if (previewLoading) return;
    loadPreviewLead(previewLead?.id);
  };

  const handlePreviewDial = () => {
    if (!previewLead || previewDialing || previewLoading) return;
    setPreviewDialing(true);
    dialerService
      .previewDial(campaign.id, previewLead.id)
      .then((res) => {
        const callId = res?.data?.call?.id;
        if (callId) {
          setActiveCallId(callId);
          recording?.setCallContext?.({ callId, toNumber: previewLead.phone, direction: "outbound" });
        }
        // Nothing else to do here — the agent's own leg now rings via the
        // same Telnyx-dialed-agent-leg path progressive mode already uses,
        // surfaced by the existing IncomingCallPanel/softphone machinery,
        // and the existing agent/current-call poll picks up the real call
        // row (and its real, event-driven status) the moment it exists.
      })
      .catch((err) => {
        notify(err?.message || "Unable to start call.", "error");
        setPreviewDialing(false);
        // The failed attempt already released the reservation server-side
        // (see dialPreviewLead in dialingEngine.js) — this lead is no
        // longer actually held for this agent, so refresh rather than
        // leave a stale, no-longer-valid lead on screen.
        loadPreviewLead();
      });
  };

  // The click just hangs up the real call — the bridge effect above is
  // what actually moves callState to "wrapup" once onCallHangup confirms
  // the session really ended.
  const handleEndCall = () => {
    softphone.hangup();
  };

  // Takes the disposition key explicitly rather than reading `disposition`
  // from closure, so a hotkey press can select-and-submit in the same tick
  // without racing React's state batching.
  const submitDisposition = (dispositionKey) => {
    if (!dispositionKey) {
      notify("Select a disposition before submitting.", "warning");
      return;
    }
    if (dispositionKey === "callback" && !scheduledCallbackAt) {
      notify("Schedule a callback time before submitting.", "warning");
      return;
    }

    const dbName = REVERSE_DISPOSITION_MAP[dispositionKey] || dispositionKey;
    const label = dispositions.find((d) => d.key === dbName)?.label || dbName;
    const callId = activeCallId;

    // The real write: calls.disposition, the lead's status/last_disposition,
    // and (for a Do Not Call disposition) the shared DNC list, all happen
    // server-side in one request. DID reputation is recalculated from the
    // calls table this feeds, so there is no separate client-side score to
    // keep in sync with it.
    if (callId) {
      callService.disposition(callId, dbName, notes || undefined).catch((err) => {
        notify(err?.message || "Could not save the disposition — it may not have been recorded.", "error");
      });
    } else {
      console.warn("[dialer] submitting disposition with no active call id — nothing will be recorded server-side.");
    }

    notify(`Call logged as "${label}".`, "success", { title: "Disposition Submitted" });
    setCallState("waiting");
    setCallSeconds(0);
    setWrapSeconds(0);
    setScheduledCallbackAt(null);
    setIsManualCall(false);
    setActiveDIDId(null);
    setActiveCallId(null);
    // Back to a blank contact so the next progressive call's lead (or the
    // next manual dial) starts clean rather than showing the previous one.
    setLead(buildEmptyLead());
    refreshStats();
  };

  const handleSubmitDisposition = () => submitDisposition(disposition);

  // Selecting via hotkey mirrors clicking the disposition button — except
  // "Callback" still needs a scheduled time first, so that one only selects
  // (revealing the scheduler) instead of auto-submitting.
  const handleHotkeyPress = (hotkey) => {
    setFlashKey(hotkey.id);
    setTimeout(() => setFlashKey((k) => (k === hotkey.id ? null : k)), 250);
    setDisposition(hotkey.dispositionKey);
    if (hotkey.dispositionKey !== "callback") {
      setScheduledCallbackAt(null);
      submitDisposition(hotkey.dispositionKey);
    }
  };

  // A single stable keydown listener (never re-subscribed) that always
  // calls the latest handler via ref — avoids both the staleness of an
  // empty-deps closure and the churn of re-attaching on every keystroke.
  const latestRef = useRef();
  latestRef.current = { callState, hotkeys, handleHotkeyPress };
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      const { callState: currentCallState, hotkeys: currentHotkeys, handleHotkeyPress: press } = latestRef.current;
      if (currentCallState !== "wrapup") return;
      const match = currentHotkeys.find((h) => h.active && matchesBinding(h.keyBinding, e));
      if (!match) return;
      e.preventDefault();
      press(match);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogBackIn = () => {
    logout();
    navigate("/agent/login");
  };

  const handleScheduleCallback = async (scheduledAt, timezone) => {
    try {
      await adminService.createCallback({
        lead_id: lead.id || null,
        campaign_id: campaign?.id || null,
        scheduled_for: new Date(scheduledAt).toISOString(),
        timezone,
      });
      setScheduledCallbackAt(scheduledAt);
      await refreshMyCallbacks();
      notify(`Callback scheduled for ${new Date(scheduledAt).toLocaleString()}.`, "success", { title: "Callback Scheduled" });
    } catch (err) {
      // Left unscheduled rather than shown as booked: an agent who is told a
      // callback is set must not be the only one who thinks so.
      notify(err?.response?.data?.message || "Could not schedule that callback.", "error");
    }
  };

  const handleDialNowPopup = async () => {
    if (!dueCallback) return;
    try {
      await resolveCallback(dueCallback.id, { status: "completed", popup_shown: true });
      await refreshMyCallbacks();
      notify("Callback marked as completed.", "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not update that callback.", "error");
    }
  };

  const handleDismissPopup = async () => {
    if (!dueCallback) return;
    try {
      await dismissCallbackPopup(dueCallback.id, { onCall: callState === "on_call" });
      await refreshMyCallbacks();
      notify("Callback dismissed — this is logged for your admin.", "warning");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not dismiss that callback.", "error");
    }
  };

  const updateLeadField = (key, value) => setLead((l) => ({ ...l, [key]: value }));
  const updateCustomValue = (fieldId, value) =>
    setLead((l) => ({ ...l, customValues: { ...l.customValues, [fieldId]: value } }));

  const handleViewProperty = () => openPropertyOnMap(lead, notify);

  const wrapRemaining = Math.max(0, wrapUpLimit - wrapSeconds);
  const wrap = wrapUpVisual(wrapSeconds);

  const conversionRate = statsToday.calls > 0 ? ((statsToday.booked / statsToday.calls) * 100).toFixed(1) : "0.0";
  const avgDuration = formatDuration(statsToday.avgDurationSeconds || 0);

  return (
    <div className="relative min-h-screen">
      <SessionEndedOverlay open={sessionEnded} onLogBackIn={handleLogBackIn} />

      <AgentStatsPanel
        open={openPanel === "dashboard"}
        onClose={closePanel}
        stats={{ ...statsToday, conversionRate, avgDuration }}
        sessionInfo={{
          // Cumulative across every login session today (backend, business
          // timezone), plus a live tick for the seconds since the last poll.
          secondsLoggedIn:
            sessionSummary?.logged_in_today_seconds != null
              ? sessionSummary.logged_in_today_seconds +
                Math.max(0, Math.floor((nowTick - (sessionSummary._fetchedAtMs ?? nowTick)) / 1000))
              : Math.floor((nowTick - loginTimeRef.current) / 1000),
          campaignName: campaign?.name ?? "—",
          autoLogoutCount,
        }}
        leaderboard={leaderboardData}
        myCallbacks={myCallbacks.slice(0, 5)}
      />

      <AgentLeaderboardPanel open={openPanel === "leaderboard"} onClose={closePanel} currentAgentName={user.name} />

      <div className="flex min-h-screen flex-col">
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-5">
          {/* LEFT — SCRIPT ONLY, always visible */}
          <div className="border-b border-[var(--color-border)] bg-white p-6 lg:col-span-2 lg:border-b-0 lg:border-r">
            <ScriptPanel agentName={user.name} lead={lead} script={script} loaded={scriptLoaded} expanded={!sidebarOpen} />
          </div>

          {/* RIGHT — CALL PANEL */}
          <div className="bg-[var(--color-bg)] p-6 lg:col-span-3 space-y-5">
            {callState === "waiting" && (
              <WaitingState
                status={status}
                statusSince={statusSince}
                statusMenuOpen={statusMenuOpen}
                setStatusMenuOpen={setStatusMenuOpen}
                onStatusChange={handleStatusChange}
                manualDialNumber={manualDialNumber}
                onManualDialNumberChange={handleManualDialNumberChange}
                onDial={handleDial}
                dialing={dialing}
                registered={softphone.status === "registered"}
                dialerState={dialerState}
                parallelSettings={parallelSettings}
                parallelStatus={parallelStatus}
                onParallelDialsChange={handleParallelDialsChange}
                statsToday={statsToday}
                dialingMode={campaign?.dialing_mode}
                leadLayout={campaign?.lead_layout}
                isPreviewMode={isPreviewMode}
                previewLead={previewLead}
                previewMessage={previewMessage}
                previewLoading={previewLoading}
                previewDialing={previewDialing}
                onPreviewDial={handlePreviewDial}
                onPreviewNext={handlePreviewNext}
              />
            )}

            {callState === "ringing" && <RingingState dialedNumber={dialedNumber} onHangup={handleEndCall} />}

            {/* An always-available escape hatch. The Hang Up control inside
                RingingState only exists once callState reaches "ringing"; if a
                dial stalls before that, this is what gets the agent out. */}
            {(softphone.callPhase !== "idle" || dialing) && callState !== "connected" && (
              <button onClick={handleEndCall} className="btn-danger w-full">
                <PhoneOff size={15} /> Hang Up / Cancel Call
              </button>
            )}

            {callState === "connected" && (
              <ConnectedState
                lead={lead}
                callSeconds={callSeconds}
                muted={softphone.muted}
                onHold={softphone.held}
                onToggleMute={softphone.toggleMute}
                onToggleHold={softphone.toggleHold}
                onEndCall={handleEndCall}
                onViewProperty={handleViewProperty}
                onOpenAvailability={() => setAvailabilityOpen(true)}
                outboundNumber={phoneNumbers.find((d) => d.id === activeDIDId)?.number}
                hotkeys={hotkeys}
                dtmfInput={dtmfInput}
                onDtmfInputChange={handleDtmfInputChange}
              />
            )}

            {callState === "wrapup" && (
              <WrapupState
                wrapRemaining={wrapRemaining}
                wrapSeconds={wrapSeconds}
                wrapUpLimit={wrapUpLimit}
                wrap={wrap}
                disposition={disposition}
                setDisposition={(key) => {
                  setDisposition(key);
                  if (key !== "callback") setScheduledCallbackAt(null);
                }}
                dispositions={dispositions}
                notes={notes}
                setNotes={setNotes}
                onSubmit={handleSubmitDisposition}
                lead={lead}
                scheduledCallbackAt={scheduledCallbackAt}
                onScheduleCallback={handleScheduleCallback}
                onCancelCallbackScheduling={() => setDisposition(null)}
                hotkeys={hotkeys}
                flashKey={flashKey}
                onHotkeyPress={handleHotkeyPress}
              />
            )}

            {/* Customer Information + Communication — both appear as soon
                as a lead is loaded, independent of call state, and both
                re-bind to the new lead on Next. Render null when there is
                no lead. */}
            <CustomerInfoFields
              fields={leadFieldConfig}
              lead={lead}
              onUpdateField={updateLeadField}
              onUpdateCustom={updateCustomValue}
              onViewProperty={handleViewProperty}
            />

            <CommunicationPanel
              campaign={campaign}
              lead={lead}
              activeCallId={activeCallId}
              onOpenSms={() => setSmsOpen(true)}
              onOpenEmail={() => setEmailOpen(true)}
            />
          </div>
        </div>

        <BottomBar campaignName={campaign?.name} status={status} statusSince={statusSince} />
      </div>

      <CallbackPopup callback={dueCallback} onDialNow={handleDialNowPopup} onDismiss={handleDismissPopup} />

      <SidePanel
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        title="Send Confirmation SMS"
        subtitle={activeCallId ? "Call continues while you send this" : "No call needed — send this now"}
      >
        <SmsForm
          key={leadId || "no-lead"}
          campaign={campaign}
          lead={lead}
          callId={activeCallId}
          onSent={() => setSmsSent(true)}
        />
      </SidePanel>

      <SidePanel
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Send Email"
        subtitle={activeCallId ? "Call continues while you send this" : "No call needed — send this now"}
      >
        <EmailComposer
          key={leadId || "no-lead"}
          campaign={campaign}
          lead={lead}
          callId={activeCallId}
          onSent={() => {}}
        />
      </SidePanel>

      <AvailabilityPanel
        open={availabilityOpen}
        onClose={() => setAvailabilityOpen(false)}
        client={resolvedClient}
        campaignName={campaign?.name}
      />
    </div>
  );
}

function WaitingState({
  status,
  statusSince,
  statusMenuOpen,
  setStatusMenuOpen,
  onStatusChange,
  manualDialNumber,
  onManualDialNumberChange,
  onDial,
  dialing,
  registered,
  dialerState,
  parallelSettings,
  parallelStatus,
  onParallelDialsChange,
  statsToday,
  dialingMode,
  leadLayout,
  isPreviewMode,
  previewLead,
  previewMessage,
  previewLoading,
  previewDialing,
  onPreviewDial,
  onPreviewNext,
}) {
  if (status === "manual_dial") {
    return (
      <div className="space-y-5">
        <ManualDialCard value={manualDialNumber} onChange={onManualDialNumberChange} onDial={onDial} dialing={dialing} registered={registered} />
        <div className="card flex flex-col items-center gap-3 py-6">
          <StatusSelector
            status={status}
            statusSince={statusSince}
            statusMenuOpen={statusMenuOpen}
            setStatusMenuOpen={setStatusMenuOpen}
            onStatusChange={onStatusChange}
          />
        </div>
      </div>
    );
  }

  // Preview is agent-driven and needs no manager Start — it gets its own
  // card (lead + DIAL + NEXT) whenever the selected campaign is a preview
  // campaign. The card itself shows whatever the backend reports: the
  // current lead, "no more leads", or "a manager has paused this campaign".
  if (isPreviewMode) {
    return (
      <div className="space-y-5">
        <PreviewDialerCard
          lead={previewLead}
          message={previewMessage}
          loading={previewLoading}
          dialing={previewDialing}
          onDial={onPreviewDial}
          onNext={onPreviewNext}
          registered={registered}
          leadLayout={leadLayout}
        />
        <div className="card flex flex-col items-center gap-3 py-6">
          <StatusSelector
            status={status}
            statusSince={statusSince}
            statusMenuOpen={statusMenuOpen}
            setStatusMenuOpen={setStatusMenuOpen}
            onStatusChange={onStatusChange}
          />
        </div>
      </div>
    );
  }

  const msg = dialerWaitingMessage(dialerState);
  const dotColor =
    msg.tone === "danger"
      ? "var(--color-danger)"
      : msg.tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-info)";
  const tintColor =
    msg.tone === "danger"
      ? "var(--color-danger-tint)"
      : msg.tone === "warning"
        ? "var(--color-warning-tint)"
        : "var(--color-info-tint)";
  const running = dialerState?.state === "running" || dialerState?.state === "waiting_for_agent";

  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span
          className={`absolute inset-0 rounded-full ${running ? "animate-pulse-slow" : ""}`}
          style={{ backgroundColor: tintColor }}
        />
        <span className="relative h-4 w-4 rounded-full" style={{ backgroundColor: dotColor }} />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-[var(--color-text-primary)]">{msg.title}</p>
        <p className="mx-auto max-w-sm text-sm text-[var(--color-text-tertiary)]">{msg.hint}</p>
        {dialerState && (dialerState.state === "running" || dialerState.state === "waiting_for_agent") && (
          <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
            {dialerState.leads_remaining?.toLocaleString?.() ?? dialerState.leads_remaining} leads remaining ·{" "}
            {dialerState.agents_available} agent{dialerState.agents_available === 1 ? "" : "s"} available
          </p>
        )}
      </div>

      {parallelSettings?.parallel_dialing_enabled && dialingMode === "parallel" && (
        <ParallelDialingPanel
          parallelSettings={parallelSettings}
          parallelStatus={parallelStatus}
          onParallelDialsChange={onParallelDialsChange}
          statsToday={statsToday}
        />
      )}

      <StatusSelector
        status={status}
        statusSince={statusSince}
        statusMenuOpen={statusMenuOpen}
        setStatusMenuOpen={setStatusMenuOpen}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

// Preview Dialing's core screen: one lead, reviewed before the agent
// decides to call it. `lead` is only ever the one currently reserved to
// this agent (see getNextPreviewLead in dialingEngine.js) — never a list,
// never preloaded ahead, matching spec's "one lead at a time" requirement.
function PreviewDialerCard({ lead, message, loading, dialing, onDial, onNext, registered, leadLayout }) {
  const busy = loading || dialing;

  if (!lead) {
    const noMoreLeads = message === "No more leads available.";
    return (
      <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
        <PhoneCall size={32} className="text-[var(--color-text-tertiary)]" />
        <p className="text-lg font-semibold text-[var(--color-text-primary)]">
          {loading ? "Loading next lead…" : message || "No lead loaded"}
        </p>
        {!loading && noMoreLeads && (
          <p className="mx-auto max-w-sm text-sm text-[var(--color-text-tertiary)]">
            Every lead in this campaign has been dialed, is on the Do Not Call list, or isn't currently callable.
          </p>
        )}
        {!loading && (
          <button onClick={onNext} className="btn-outline mt-2 flex items-center gap-2">
            <RefreshCw size={14} /> Check again
          </button>
        )}
      </div>
    );
  }

  const isVacation = leadLayout === "vacation";

  return (
    <div className="card space-y-5 py-8 text-center">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Current Lead</p>
        <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{lead.fullName}</p>
        {isVacation && lead.age != null && (
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Age {lead.age}</p>
        )}
        {(lead.city || lead.state) && (
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-[var(--color-text-tertiary)]">
            <MapPin size={13} /> {[lead.city, lead.state].filter(Boolean).join(", ")}
          </p>
        )}
        <p className="mt-1 text-lg text-[var(--color-text-secondary)]">{lead.phone || "No phone number on file"}</p>

        {isVacation && (lead.lastTravelDate || lead.lastTravelDestination) && (
          <div className="mx-auto mt-3 max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Travel History</p>
            {lead.lastTravelDate && (
              <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                <span className="text-[var(--color-text-tertiary)]">Last traveled:</span> {lead.lastTravelDate}
              </p>
            )}
            {lead.lastTravelDestination && (
              <p className="mt-0.5 text-sm text-[var(--color-text-primary)]">
                <span className="text-[var(--color-text-tertiary)]">Last destination:</span> {lead.lastTravelDestination}
              </p>
            )}
          </div>
        )}

        <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
          Called {lead.timesCalled || 0}x · Last outcome: {lead.lastDisposition}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          {dialing ? "Calling…" : "Ready"}
        </span>
      </div>

      <div className="mx-auto flex max-w-xs flex-col gap-3">
        <button
          onClick={onDial}
          disabled={busy || !registered}
          className="btn-purple flex items-center justify-center gap-2 py-3 text-base"
          title={!registered ? "Softphone is not registered yet" : undefined}
        >
          <PhoneCall size={18} /> {dialing ? "Calling…" : "Dial"}
        </button>
        <button onClick={onNext} disabled={busy} className="btn-outline flex items-center justify-center gap-2 py-3 text-base">
          Next <ChevronDown size={16} className="-rotate-90" />
        </button>
      </div>
    </div>
  );
}

// The Parallel Dialing controls + live indicator, shown on the waiting
// screen whenever the company has parallel dialing turned on. Three real,
// server-backed things live here — none of it a client-side simulation:
//   - Parallel Dials: this agent's own setting (GET/POST /agent/parallel-dials),
//     options capped at the admin's configured maximum.
//   - Active Calls: how many of the agent's current batch are still
//     actually ringing right now (GET /agent/parallel-status, polled every
//     2s) — reflects real open call rows, not the configured target.
//   - Calls Made Today / Connected Today: the same real figures already
//     shown in the stats panel, surfaced here too per spec.
function ParallelDialingPanel({ parallelSettings, parallelStatus, onParallelDialsChange, statsToday }) {
  const options = Array.from({ length: parallelSettings.max_parallel_dials || 5 }, (_, i) => i + 1);
  const activeCalls = parallelStatus?.active_calls || 0;
  const requested = parallelStatus?.requested_count || 0;

  return (
    <div className="w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-white p-4 text-left">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Parallel Dials</label>
        <select
          value={parallelSettings.parallel_dials}
          onChange={(e) => onParallelDialsChange(Number(e.target.value))}
          className="input-field w-20 py-1 text-sm"
        >
          {options.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* The visual indicator: a phone icon with one pip per requested slot
          in this batch, filled for a slot that's still actually ringing and
          hollow once it has resolved — so it moves in real time as legs
          answer, go to voicemail, or ring out, rather than just showing the
          configured target the whole time. */}
      <div className="mb-3 flex items-center gap-2">
        <PhoneCall size={16} className={activeCalls > 0 ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"} />
        <div className="flex items-center gap-1">
          {requested > 0 ? (
            Array.from({ length: requested }, (_, i) => (
              <span
                key={i}
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-300 ${
                  i < activeCalls
                    ? "animate-pulse-slow bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-bg)] text-[var(--color-text-tertiary)]"
                }`}
              >
                {i + 1}
              </span>
            ))
          ) : (
            <span className="text-xs text-[var(--color-text-tertiary)]">No active dials</span>
          )}
        </div>
        {activeCalls > 0 && (
          <span className="ml-1 text-xs font-medium text-[var(--color-accent)]">
            {activeCalls} ACTIVE DIAL{activeCalls === 1 ? "" : "S"}
          </span>
        )}
      </div>

      <div className="flex gap-2 border-t border-[var(--color-border)] pt-3 text-center">
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{statsToday?.calls ?? 0}</p>
          <p className="text-[10px] text-[var(--color-text-tertiary)]">Calls Made Today</p>
        </div>
        <div className="flex-1 border-l border-[var(--color-border)]">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{statsToday?.connects ?? 0}</p>
          <p className="text-[10px] text-[var(--color-text-tertiary)]">Connected Today</p>
        </div>
      </div>
    </div>
  );
}

// Covers both the "dialing" and "ringing" phases of an outbound Manual
// Dial call (SIP.js/SimpleUser doesn't distinguish the two), plus the
// brief moment before an incoming leg is auto-answered. Same pulsing-dot
// pattern as WaitingState above — just with a live Hang Up control, since
// there was previously no way to cancel a call before it connected.
function RingingState({ dialedNumber, onHangup }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-slow rounded-full bg-[var(--color-info-tint)]" />
        <span className="relative h-4 w-4 rounded-full bg-[var(--color-info)]" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-[var(--color-text-primary)]">
          {dialedNumber ? `Calling ${dialedNumber}…` : "Connecting call…"}
        </p>
        <p className="text-sm text-[var(--color-text-tertiary)]">Ringing</p>
      </div>
      <button onClick={onHangup} className="btn-danger px-6">
        <PhoneOff size={16} /> Hang Up
      </button>
    </div>
  );
}

function StatusSelector({ status, statusSince, statusMenuOpen, setStatusMenuOpen, onStatusChange }) {
  return (
    <div className="relative mt-2 w-full max-w-xs">
      <button
        onClick={() => setStatusMenuOpen(!statusMenuOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2.5 transition-colors hover:bg-[var(--color-bg)]"
      >
        <StatusPill status={status} since={statusSince} showTimer />
        <ChevronDown size={14} className="text-[var(--color-text-tertiary)]" />
      </button>
      {statusMenuOpen && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => onStatusChange(opt.key)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getStatusVisual(opt.key, 0).color }} />
                {Icon && <Icon size={14} className="text-[var(--color-text-tertiary)]" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManualDialCard({ value, onChange, onDial, dialing, registered }) {
  const disabled = dialing || !registered;
  return (
    <div className="card w-full max-w-md mx-auto">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
          <Phone size={16} />
        </span>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Manual Dial</h3>
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !disabled && onDial()}
          placeholder="(555) 555-0100"
          className="input-field flex-1 py-3 text-lg"
          autoFocus
        />
        <button onClick={onDial} disabled={disabled} className="btn-purple px-6">
          <PhoneCall size={16} /> {dialing ? "Calling…" : "Dial"}
        </button>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">
        {registered
          ? "You are in Manual Dial mode. Automated calls are paused."
          : "Waiting for the softphone to register before you can dial out."}
      </p>
    </div>
  );
}

function ConnectedState({
  lead,
  callSeconds,
  muted,
  onHold,
  onToggleMute,
  onToggleHold,
  onEndCall,
  onOpenAvailability,
  outboundNumber,
  hotkeys,
  dtmfInput,
  onDtmfInputChange,
}) {
  const ringColor = getStatusVisual("on_call", callSeconds).color;

  return (
    <div className="space-y-5">
      <div className="card flex flex-col items-center gap-2 py-6">
        <div
          className="flex h-28 w-28 items-center justify-center rounded-full border-[6px] transition-colors duration-700"
          style={{ borderColor: ringColor }}
        >
          <span className="text-2xl font-bold text-[var(--color-text-primary)]">{formatDuration(callSeconds)}</span>
        </div>
        <span className="pill mt-1" style={{ backgroundColor: `${ringColor}18`, color: ringColor }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ringColor }} /> Live Call
        </span>
        {outboundNumber && <p className="text-xs text-[var(--color-text-tertiary)]">Calling from {outboundNumber}</p>}
      </div>

      {/* Customer Information renders once at the workspace level (it is
          available from the moment the lead loads, not just on a call). */}

      <div className="card">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Previous History</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill bg-[var(--color-bg)] text-[var(--color-text-secondary)]">Called {lead.timesCalled}x</span>
          <span className="pill border border-[var(--color-info)]/25 bg-[var(--color-info-tint)] text-[var(--color-info)]">{lead.lastDisposition}</span>
        </div>
        <div className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <p className="text-sm text-[var(--color-text-secondary)]">{lead.notes || "No notes on file."}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Call Controls</h3>
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={onToggleMute} className={muted ? "btn-purple" : "btn-gray"}>
            {muted ? <MicOff size={15} /> : <Mic size={15} />} Mute
          </button>
          <button onClick={onToggleHold} className={onHold ? "btn-purple" : "btn-gray"}>
            {onHold ? <Play size={15} /> : <Pause size={15} />} Hold
          </button>
          <button onClick={onEndCall} className="btn-danger">
            <PhoneOff size={15} /> End Call
          </button>
        </div>
        <div className="mt-2.5">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Send Keypad Tones (DTMF)</label>
          <input
            value={dtmfInput}
            onChange={(e) => onDtmfInputChange(e.target.value)}
            placeholder="Type digits to send…"
            inputMode="tel"
            className="input-field font-mono tracking-widest"
          />
        </div>
        <div className="mt-2.5 space-y-2">
          {/* SMS / Email now live in the always-on CommunicationPanel below,
              which is available from the moment the lead loads — not tied to
              this connected-call view. */}
          <button onClick={onOpenAvailability} className="btn-outline w-full">
            <CalendarDays size={15} /> Availability
          </button>
        </div>
      </div>

      <div className="card">
        <HotkeyBar hotkeys={hotkeys} active={false} flashingId={null} onPress={() => {}} />
      </div>
    </div>
  );
}

function WrapupState({
  wrapRemaining,
  wrapSeconds,
  wrapUpLimit,
  wrap,
  disposition,
  setDisposition,
  dispositions,
  notes,
  setNotes,
  onSubmit,
  lead,
  scheduledCallbackAt,
  onScheduleCallback,
  onCancelCallbackScheduling,
  hotkeys,
  flashKey,
  onHotkeyPress,
}) {
  const urgent = wrapRemaining <= 10 && wrapRemaining > 0;
  const critical = wrapRemaining <= 5 && wrapRemaining > 0;

  return (
    <div className="space-y-5">
      <div className={`card flex flex-col items-center gap-2 py-8 border-2 ${critical ? "animate-timer-shake" : ""}`} style={{ borderColor: wrap.color }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Wrap-Up Time</h3>
        <span className={`text-4xl font-bold ${urgent ? "animate-timer-pulse" : ""}`} style={{ color: urgent ? "var(--color-danger)" : wrap.color }}>
          {formatDuration(wrapRemaining)}
        </span>
        <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-bg)]">
          <div
            className="h-full rounded-full transition-all duration-1000 linear"
            style={{ width: `${Math.min(100, (wrapSeconds / wrapUpLimit) * 100)}%`, backgroundColor: wrap.color }}
          />
        </div>
      </div>

      <div className="card">
        <HotkeyBar hotkeys={hotkeys} active flashingId={flashKey} onPress={onHotkeyPress} />
      </div>

      <div className="card">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Disposition</h3>

        {/* Loaded from the database, so this can legitimately be empty for a
            moment on load, or permanently if nobody has configured any. The
            agent is told which, rather than shown a broken panel. */}
        {dispositions.length === 0 ? (
          <p className="py-3 text-sm text-[var(--color-text-tertiary)]">
            No dispositions have been configured. An admin can add them under Campaigns → Disposition.
          </p>
        ) : (
          <>
            <DispositionButton
              d={dispositions[0]}
              selected={disposition === dispositions[0].key}
              onClick={() => setDisposition(dispositions[0].key)}
              large
            />

            <div className="mt-2 grid grid-cols-2 gap-2">
              {dispositions.slice(1).map((d) => (
                <DispositionButton key={d.key} d={d} selected={disposition === d.key} onClick={() => setDisposition(d.key)} />
              ))}
            </div>
          </>
        )}

        {disposition === "callback" && !scheduledCallbackAt && (
          <div className="mt-3">
            <CallbackScheduler lead={lead} onSchedule={onScheduleCallback} onCancel={onCancelCallbackScheduling} />
          </div>
        )}

        {disposition === "callback" && scheduledCallbackAt && (
          <div className="mt-3 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-tint)] px-4 py-3 text-sm font-medium text-[var(--color-success)]">
            <Check size={14} className="mr-1 inline" /> Callback scheduled for {new Date(scheduledCallbackAt).toLocaleString()}
          </div>
        )}

        <h4 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Call Notes</h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about this call…"
          className="input-field resize-none"
        />

        <button onClick={onSubmit} className="btn-purple mt-4 w-full py-3">
          Submit
        </button>
      </div>
    </div>
  );
}

function DispositionButton({ d, selected, onClick, large = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border-2 text-left font-semibold transition-all duration-150 ${large ? "px-4 py-4 text-base" : "px-3 py-3 text-sm"}`}
      style={{
        borderColor: selected ? d.color : "var(--color-border)",
        backgroundColor: selected ? `${d.color}14` : "var(--color-bg)",
        color: selected ? d.color : "var(--color-text-primary)",
      }}
    >
      {d.label}
    </button>
  );
}

// The backend models a script as a single free-text block (title +
// content), not the structured {intro, keyPoints, objections} shape the
// old mock script used — so this renders real script text as-is (with
// the same {agent_name}/{lead_name}/{location} substitution) instead of
// simulating a structured outline the API doesn't provide.
// Splits a script's raw content into named sections wherever it uses
// Markdown-style headers (# or ##) — e.g. "## Opening", "## Objections".
// This is deliberately just a split on the document's own headers rather
// than a rewrite into a fixed schema: whatever section names and order the
// uploaded script actually used are exactly what gets preserved and
// navigated, nothing invented or reordered. A script with no headers at
// all (every script in this system before this feature) comes back as one
// unnamed section, so the panel still renders it exactly as before.
function parseScriptSections(content) {
  const text = content || "";
  const headerRe = /^#{1,3}\s+(.+?)\s*$/;

  const sections = [];
  let current = { title: null, body: [] }; // text before the first header, if any
  for (const line of text.split("\n")) {
    const m = headerRe.exec(line);
    if (m) {
      sections.push(current);
      current = { title: m[1], body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);

  return sections
    .map((s) => ({ title: s.title, body: s.body.join("\n").trim() }))
    .filter((s) => s.title || s.body); // drop an empty leading preamble
}

function ScriptPanel({ agentName, lead, script, loaded, expanded = false }) {
  const fill = (text) =>
    (text || "")
      .replaceAll("{agent_name}", agentName)
      .replaceAll("{lead_name}", lead.fullName)
      .replaceAll("{location}", `${lead.city}, ${lead.state}`);

  const sections = script ? parseScriptSections(script.content) : [];
  const hasNamedSections = sections.some((s) => s.title);
  const [openSections, setOpenSections] = useState(null); // null = "everything open" (default)
  // A different script (campaign switch, or the assigned one being changed)
  // must not inherit stale collapsed/expanded indices from the last one.
  useEffect(() => {
    setOpenSections(null);
  }, [script?.id]);
  const isOpen = (i) => openSections === null || openSections.has(i);
  const toggleSection = (i) => {
    setOpenSections((prev) => {
      const next = new Set(prev ?? sections.map((_, idx) => idx));
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  const jumpTo = (i) => {
    if (openSections !== null && !openSections.has(i)) toggleSection(i);
    document.getElementById(`script-section-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className={`sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto transition-all duration-300 ease-out ${
        expanded ? "mx-auto max-w-3xl" : ""
      }`}
    >
      <h3 className={`mb-1 font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] transition-all duration-300 ${expanded ? "text-sm" : "text-xs"}`}>
        Call Script
      </h3>

      {!loaded && <p className="text-sm text-[var(--color-text-tertiary)]">Loading script…</p>}

      {loaded && !script && (
        <p className="rounded-lg bg-[var(--color-bg)] p-4 text-sm text-[var(--color-text-tertiary)]">
          No script has been assigned to this campaign yet.
        </p>
      )}

      {loaded && script && (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className={`font-semibold text-[var(--color-text-primary)] transition-all duration-300 ${expanded ? "text-lg" : "text-base"}`}>
              {script.title}
            </p>
            {hasNamedSections && (
              <button
                onClick={() => setOpenSections(openSections === null ? new Set() : null)}
                className="shrink-0 text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                {openSections === null ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>

          {/* Jump nav — only worth showing once the script actually has more
              than one named section to navigate between. */}
          {hasNamedSections && sections.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {sections.map((s, i) =>
                s.title ? (
                  <button
                    key={i}
                    onClick={() => jumpTo(i)}
                    className="pill border border-[var(--color-accent)]/25 bg-[var(--color-accent-tint)] text-[11px] text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-white"
                  >
                    {s.title}
                  </button>
                ) : null
              )}
            </div>
          )}

          <div className="space-y-2.5">
            {sections.map((s, i) => (
              <div key={i} id={`script-section-${i}`} className="overflow-hidden rounded-lg bg-[var(--color-bg)]">
                {s.title && (
                  <button
                    onClick={() => toggleSection(i)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-[var(--color-text-primary)] hover:bg-black/[0.02]"
                  >
                    {s.title}
                    <ChevronDown size={14} className={`text-[var(--color-text-tertiary)] transition-transform duration-200 ${isOpen(i) ? "rotate-180" : ""}`} />
                  </button>
                )}
                {isOpen(i) && s.body && (
                  <p
                    className={`whitespace-pre-wrap leading-relaxed text-[var(--color-text-primary)] transition-all duration-300 ${
                      s.title ? "px-4 pb-4" : "p-4"
                    } ${expanded ? "text-[17px]" : "text-[15px]"}`}
                  >
                    {fill(s.body)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BottomBar({ campaignName, status, statusSince }) {
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-white px-6 py-3">
      <span className="text-xs text-[var(--color-text-secondary)]">
        Campaign: <span className="font-medium text-[var(--color-text-primary)]">{campaignName}</span>
      </span>
      <StatusPill status={status} since={statusSince} size="sm" />
    </div>
  );
}

/**
 * Books the appointment, renders its confirmation from the campaign's
 * template, and sends it — all without leaving the call.
 *
 * Once sent it turns into the live thread, so the agent can ask "did you get
 * the text?" and watch the customer's reply arrive while still on the phone.
 */
function SmsForm({ campaign, lead, callId, onSent }) {
  const { notify } = useToast();
  const [scheduledAt, setScheduledAt] = useState("");
  const [preview, setPreview] = useState(null);
  const [body, setBody] = useState("");
  const [appointmentId, setAppointmentId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [busy, setBusy] = useState(false);

  // Booked and rendered together: the template can only quote a date and
  // address once there is an appointment record holding them.
  const build = useCallback(async () => {
    if (!campaign?.id) return;
    setBusy(true);
    try {
      const appt = await smsService.createAppointment({
        campaign_id: campaign.id,
        call_id: callId || null,
        title: `${campaign.name} appointment`,
        // Sent only when the agent actually set one. An empty field means no
        // time was agreed, and the message says nothing about timing rather
        // than inventing something.
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        street_address: lead.street || null,
        city: lead.city || null,
        state: lead.state || null,
        zip_code: lead.zip || null,
      });
      const id = appt?.data?.id;
      setAppointmentId(id);
      const res = await smsService.confirmationPreview(id);
      setPreview(res?.data || null);
      setBody(res?.data?.text || "");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not prepare the confirmation.", "error");
    } finally {
      setBusy(false);
    }
  }, [campaign, callId, scheduledAt, lead, notify]);

  useEffect(() => { build(); }, [build]);

  const send = async () => {
    if (!appointmentId) return;
    setBusy(true);
    try {
      const res = await smsService.sendConfirmation(appointmentId, {
        body,
        to_number: lead.phone,
      });
      setConversationId(res?.data?.conversation?.id || null);
      notify("Confirmation sent.", "success");
      onSent?.();
    } catch (err) {
      notify(err?.response?.data?.message || "The confirmation could not be sent.", "error");
    } finally {
      setBusy(false);
    }
  };

  // After sending, the panel becomes the conversation — the agent needs to see
  // the customer's reply, not a "sent" tick.
  if (conversationId) {
    return (
      <div className="-mx-6 -mb-6 h-[70vh]">
        <SmsConversation conversationId={conversationId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Appointment Date &amp; Time <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="input-field"
        />
        <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
          Left blank, the message simply confirms the appointment without quoting a time.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="input-field resize-none text-sm"
          placeholder={busy ? "Preparing…" : "The confirmation will appear here."}
        />
        {preview?.segments > 1 && (
          <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">{preview.segments} SMS segments</p>
        )}
        {/* Said plainly rather than shown as a placeholder: the customer will
            never see a {{variable}}, but the agent should know the sentence is
            thinner than the template intended. */}
        {preview?.unresolved_variables?.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-[var(--color-warning)]">
            <AlertTriangle size={12} className="mt-px shrink-0" />
            Not on file, so left out: {preview.unresolved_variables.join(", ").replace(/_/g, " ")}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Sending To</label>
        <input value={lead.phone} readOnly className="input-field bg-[var(--color-bg)]" />
      </div>

      <button onClick={send} disabled={busy || !body.trim() || !lead.phone} className="btn-purple w-full py-3 disabled:opacity-40">
        {busy ? "Working…" : "Send Confirmation SMS"}
      </button>
      <p className="text-[11px] text-[var(--color-text-tertiary)]">
        The appointment is only marked confirmed when the customer replies — a delivered text is not a confirmation.
      </p>
    </div>
  );
}
