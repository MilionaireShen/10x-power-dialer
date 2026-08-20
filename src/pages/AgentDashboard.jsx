import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Mic, MicOff, Pause, Play, PhoneOff, Phone, PhoneCall, ChevronDown, MessageSquareText, Check, MapPin, CalendarDays } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";
import StatusPill from "../components/StatusPill";
import SidePanel from "../components/SidePanel";
import AgentStatsPanel from "../components/AgentStatsPanel";
import AgentLeaderboardPanel from "../components/AgentLeaderboardPanel";
import CallbackScheduler from "../components/CallbackScheduler";
import CallbackPopup from "../components/CallbackPopup";
import AvailabilityPanel from "../components/AvailabilityPanel";
import HotkeyBar from "../components/HotkeyBar";
import SessionEndedOverlay from "../components/SessionEndedOverlay";
import { DISPOSITIONS, SMS_PREVIEW_SAMPLE } from "../data/mockData";
import { formatDuration, wrapUpVisual, getStatusVisual } from "../lib/statusColors";
import { openPropertyOnMap } from "../lib/googleMaps";
import { extractAreaCode } from "../lib/didReputationEngine";
import { matchesBinding } from "../lib/hotkeys";
import campaignService from "../services/campaignService";
import hotkeyService from "../services/hotkeyService";
import scriptService from "../services/scriptService";
import agentService from "../services/agentService";
import reportService from "../services/reportService";
import { useSoftphone } from "../lib/softphone";

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

export default function AgentDashboard() {
  const { user, activeCampaignId, sessionId, logout } = useAuth();
  const {
    campaigns,
    clients,
    customFields,
    callbacks,
    addCallback,
    updateCallbackStatus,
    agentMessages,
    consumeAgentMessage,
    agentControl,
    logManualDialCall,
    phoneNumbers,
    selectBestDID,
    markDIDInUse,
    recordCallOutcome,
    recordAgentLogout,
  } = useAppData();
  const { notify } = useToast();
  const navigate = useNavigate();
  const { sidebarOpen, openPanel, closePanel } = useOutletContext();

  // WebRTC softphone (SIP.js) registered against Telnyx — the one real
  // call this screen can ever have live is whatever SimpleUser is tracking
  // here; callState below just mirrors it for the rest of the UI.
  const softphone = useSoftphone({ enabled: true });

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
  const resolvedClient = clients.find((c) => c.campaignIds?.includes(campaign?.id)) ?? null;
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

  const [status, setStatus] = useState("available");
  const [statusSince, setStatusSince] = useState(Date.now());
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const [callState, setCallState] = useState("waiting"); // waiting | connected | wrapup
  const [callSeconds, setCallSeconds] = useState(0);
  const [wrapSeconds, setWrapSeconds] = useState(0);
  const [disposition, setDisposition] = useState(null);
  const [notes, setNotes] = useState("");

  const [lead, setLead] = useState(buildEmptyLead);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsNote, setSmsNote] = useState("");
  const [manualDialNumber, setManualDialNumber] = useState("");
  const [dialing, setDialing] = useState(false);
  const [isManualCall, setIsManualCall] = useState(false);
  // The DID Reputation Engine — never chosen by the agent. selectBestDID()
  // picks it the instant a call connects; recordCallOutcome() reports back
  // to the engine the instant wrap-up is submitted.
  const [activeDIDId, setActiveDIDId] = useState(null);
  const [flashKey, setFlashKey] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [scheduledCallbackAt, setScheduledCallbackAt] = useState(null);
  const [activeDuePopup, setActiveDuePopup] = useState(null);
  const lastForcedAtRef = useRef(null);
  const lastForceLogoutAtRef = useRef(null);

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
        booked: breakdown["Booked Appointment"] ?? 0,
        notInterested: breakdown["Not Interested"] ?? 0,
        noAnswers: breakdown["No Answer"] ?? 0,
        avgDurationSeconds: row?.avg_call_duration_seconds ?? 0,
      }));
    } catch {
      // leave the last known values on screen rather than blanking them
    }
  }, [user.id]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

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
          if (!cancelled) setSessionSummary(res.data);
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

  // Bridges the softphone's real call state into this screen's own
  // waiting/connected/wrapup machine — an incoming leg auto-answered by
  // the softphone (or a Manual Dial call once it's actually picked up)
  // flips this to "connected"; the call ending, whichever side hangs up,
  // flips it to "wrapup" exactly like a manual End Call click would.
  const wasCallActiveRef = useRef(false);
  useEffect(() => {
    const wasActive = wasCallActiveRef.current;
    wasCallActiveRef.current = softphone.callActive;
    if (softphone.callActive && !wasActive) {
      notify("Call connected.", "info");
      setCallState("connected");
      setCallSeconds(0);
      setSmsOpen(false);
      setSmsSent(false);
      setSmsNote("");
    } else if (!softphone.callActive && wasActive) {
      setCallState((cs) => (cs === "connected" ? "wrapup" : cs));
      setWrapSeconds(0);
      setDisposition(null);
      setNotes("");
      setSmsOpen(false);
      setScheduledCallbackAt(null);
    }
  }, [softphone.callActive, notify]);

  // Whether the call was answered or the dial attempt failed/was rejected,
  // the "dialing" phase is over once callActive settles either way.
  useEffect(() => {
    setDialing(false);
  }, [softphone.callActive]);

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
  // another component's setter (recordAgentLogout, from AppDataProvider)
  // from inside one trips React's "setState while rendering a different
  // component" warning.
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
      recordAgentLogout(user.name, "wrapup_timeout");
      localStorage.setItem("logout_reason", "wrapup_timeout");
      setSessionEnded(true);
    }
  }, [wrapSeconds, callState, sessionEnded, notify, user.name, wrapUpLimit, recordAgentLogout]);

  // Poll for a scheduled callback whose time has arrived — surfaces a
  // bottom-right popup without ever covering the call panel or script.
  useEffect(() => {
    const id = setInterval(() => {
      setActiveDuePopup((current) => {
        if (current) return current;
        const due = callbacks.find(
          (c) => c.agentName === user.name && c.status === "Pending" && c.scheduledAt <= Date.now()
        );
        return due ?? null;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [callbacks, user.name]);

  // An admin can remotely force a status change or log this agent out —
  // reflected instantly since it's the same shared context.
  useEffect(() => {
    if (agentControl.forcedFor !== user.name || !agentControl.forcedAt) return;
    if (lastForcedAtRef.current === agentControl.forcedAt) return;
    lastForcedAtRef.current = agentControl.forcedAt;
    setStatus(agentControl.forcedStatus);
    setStatusSince(Date.now());
    notify(`An administrator changed your status to "${agentControl.forcedStatus}".`, "warning", { title: "Status Changed by Admin" });
  }, [agentControl, notify, user.name]);

  useEffect(() => {
    if (agentControl.forceLogoutFor !== user.name || !agentControl.forceLogoutAt) return;
    if (lastForceLogoutAtRef.current === agentControl.forceLogoutAt) return;
    lastForceLogoutAtRef.current = agentControl.forceLogoutAt;
    notify("You were logged out by an administrator.", "error", { title: "Force Logout" });
    localStorage.setItem("logout_reason", "admin_kick");
    logout();
    navigate("/agent/login");
  }, [agentControl, notify, user.name, logout, navigate]);

  // Admin-sent messages surface as a toast, matching the "small pop-up"
  // requirement without a second overlay system.
  useEffect(() => {
    const mine = agentMessages.filter((m) => m.agentName === user.name);
    mine.forEach((m) => {
      notify(m.text, "info", { title: `Message from ${m.from}` });
      consumeAgentMessage(m.id);
    });
  }, [agentMessages, user.name, notify, consumeAgentMessage]);

  const handleStatusChange = (key) => {
    setStatus(key);
    setStatusSince(Date.now());
    setStatusMenuOpen(false);
    // Best-effort — the local status UI is authoritative either way, this
    // just keeps the backend's agent_sessions row in sync for reporting.
    agentService.changeStatus(key).catch(() => {});
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
    setLead(buildManualDialLead(trimmed));
    setIsManualCall(true);
    const bestDID = selectBestDID(campaign?.id, extractAreaCode(trimmed));
    if (bestDID) {
      setActiveDIDId(bestDID.id);
      markDIDInUse(bestDID.id);
    } else {
      setActiveDIDId(null);
    }
    setManualDialNumber("");
    setDialing(true);
    // The screen doesn't flip to "connected" here — the softphone bridge
    // effect above does that once onCallAnswered actually fires, so this
    // waits for the real call the same way an incoming leg does.
    softphone.call(trimmed).catch((err) => {
      notify(err?.message || "Could not place the call.", "error");
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
    if (activeDIDId) {
      recordCallOutcome(activeDIDId, {
        answered: dispositionKey !== "no_answer",
        rejected: false,
        durationSec: callSeconds,
        disposition: dispositionKey,
        dncRequest: dispositionKey === "dnc",
        complaint: false,
      });
    }
    if (isManualCall) {
      const dispositionInfo = DISPOSITIONS.find((d) => d.key === dispositionKey);
      logManualDialCall({
        agentName: user.name,
        leadName: lead.fullName,
        phone: lead.phone,
        duration: formatDuration(callSeconds),
        disposition: dispositionInfo?.label,
        dispositionColor: dispositionInfo?.color,
        campaign: campaign?.name,
      });
    }
    notify(`Call logged as "${DISPOSITIONS.find((d) => d.key === dispositionKey)?.label}".`, "success", {
      title: "Disposition Submitted",
    });
    setCallState("waiting");
    setCallSeconds(0);
    setWrapSeconds(0);
    setScheduledCallbackAt(null);
    setIsManualCall(false);
    setActiveDIDId(null);
    // Only moves the needle when this disposition corresponds to a real
    // backend call record (e.g. from an actual dialer-engine campaign) —
    // the on-screen call simulation itself doesn't create one.
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

  const handleScheduleCallback = (scheduledAt, timezone) => {
    addCallback({ agentName: user.name, leadName: lead.fullName, phone: lead.phone, scheduledAt, timezone });
    setScheduledCallbackAt(scheduledAt);
    notify(`Callback scheduled for ${new Date(scheduledAt).toLocaleString()}.`, "success", { title: "Callback Scheduled" });
  };

  const handleDialNowPopup = () => {
    if (!activeDuePopup) return;
    updateCallbackStatus(activeDuePopup.id, "Completed", { completedAt: Date.now() });
    notify(`Marked callback with ${activeDuePopup.leadName} as completed.`, "success");
    setActiveDuePopup(null);
  };

  const handleDismissPopup = () => {
    if (!activeDuePopup) return;
    updateCallbackStatus(activeDuePopup.id, "Dismissed", { dismissedAt: Date.now() });
    notify("Callback dismissed — this is logged for your admin.", "warning");
    setActiveDuePopup(null);
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

      {/* Remote call audio only — local mic capture is handled internally
          by SIP.js via getUserMedia, nothing to render for it. */}
      <audio ref={softphone.remoteAudioRef} autoPlay style={{ display: "none" }} />

      <AgentStatsPanel
        open={openPanel === "dashboard"}
        onClose={closePanel}
        stats={{ ...statsToday, conversionRate, avgDuration }}
        sessionInfo={{
          secondsLoggedIn: sessionSummary?.total_duration_seconds ?? Math.floor((nowTick - loginTimeRef.current) / 1000),
          campaignName: campaign?.name ?? "—",
          autoLogoutCount,
        }}
        leaderboard={leaderboardData}
        myCallbacks={callbacks.filter((c) => c.agentName === user.name).slice(0, 5)}
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
                onManualDialNumberChange={setManualDialNumber}
                onDial={handleDial}
                dialing={dialing}
              />
            )}

            {callState === "connected" && (
              <ConnectedState
                lead={lead}
                onUpdateField={updateLeadField}
                onUpdateCustom={updateCustomValue}
                customFields={customFields}
                callSeconds={callSeconds}
                muted={softphone.muted}
                onHold={softphone.held}
                onToggleMute={softphone.toggleMute}
                onToggleHold={softphone.toggleHold}
                onEndCall={handleEndCall}
                smsEnabled={Boolean(campaign?.smsEnabled)}
                onOpenSms={() => setSmsOpen(true)}
                onViewProperty={handleViewProperty}
                onOpenAvailability={() => setAvailabilityOpen(true)}
                outboundNumber={phoneNumbers.find((d) => d.id === activeDIDId)?.number}
                hotkeys={hotkeys}
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
          </div>
        </div>

        <BottomBar
          campaignName={campaign?.name}
          status={status}
          statusSince={statusSince}
          softphoneStatus={softphone.status}
          softphoneError={softphone.statusError}
          onRetrySoftphone={softphone.retry}
        />
      </div>

      <CallbackPopup callback={activeDuePopup} onDialNow={handleDialNowPopup} onDismiss={handleDismissPopup} />

      <SidePanel
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        title="Send Confirmation SMS"
        subtitle="Call continues while you send this"
      >
        <SmsForm
          campaign={campaign}
          lead={lead}
          agentName={user.name}
          smsNote={smsNote}
          setSmsNote={setSmsNote}
          sent={smsSent}
          onSend={() => {
            setSmsSent(true);
            notify("Confirmation SMS sent to lead.", "success");
          }}
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
}) {
  if (status === "manual_dial") {
    return (
      <div className="space-y-5">
        <ManualDialCard value={manualDialNumber} onChange={onManualDialNumberChange} onDial={onDial} dialing={dialing} />
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

  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-slow rounded-full bg-[var(--color-info-tint)]" />
        <span className="relative h-4 w-4 rounded-full bg-[var(--color-info)]" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-[var(--color-text-primary)]">Waiting for campaign to start...</p>
        <p className="text-sm text-[var(--color-text-tertiary)]">You'll be connected automatically once the dialer has a call for you</p>
      </div>

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

function ManualDialCard({ value, onChange, onDial, dialing }) {
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
          onKeyDown={(e) => e.key === "Enter" && !dialing && onDial()}
          placeholder="(555) 555-0100"
          className="input-field flex-1 py-3 text-lg"
          autoFocus
        />
        <button onClick={onDial} disabled={dialing} className="btn-purple px-6">
          <PhoneCall size={16} /> {dialing ? "Calling…" : "Dial"}
        </button>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">
        You are in Manual Dial mode. Automated calls are paused.
      </p>
    </div>
  );
}

function ConnectedState({
  lead,
  onUpdateField,
  onUpdateCustom,
  customFields,
  callSeconds,
  muted,
  onHold,
  onToggleMute,
  onToggleHold,
  onEndCall,
  smsEnabled,
  onOpenSms,
  onViewProperty,
  onOpenAvailability,
  outboundNumber,
  hotkeys,
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

      <div className="card">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Contact Details</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LeadField label="Full Name" value={lead.fullName} onChange={(v) => onUpdateField("fullName", v)} />
          <LeadField label="Phone Number" value={lead.phone} onChange={(v) => onUpdateField("phone", v)} />
          <LeadField label="Email Address" value={lead.email} onChange={(v) => onUpdateField("email", v)} className="sm:col-span-2" />
        </div>

        <div className="mb-3 mt-5 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Address Details</h3>
          <button onClick={onViewProperty} className="btn-outline py-1 px-2.5 text-xs">
            <MapPin size={12} /> View Property
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LeadField label="Street Address" value={lead.street} placeholder="123 Main Street" onChange={(v) => onUpdateField("street", v)} className="sm:col-span-2" />
          <LeadField label="City" value={lead.city} onChange={(v) => onUpdateField("city", v)} />
          <LeadField label="State" value={lead.state} onChange={(v) => onUpdateField("state", v)} />
          <LeadField label="Zip Code" value={lead.zip} onChange={(v) => onUpdateField("zip", v)} />
        </div>

        {customFields.length > 0 && (
          <>
            <h3 className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Custom Fields</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customFields.map((f) => (
                <LeadField
                  key={f.id}
                  label={f.label}
                  value={lead.customValues?.[f.id] ?? ""}
                  onChange={(v) => onUpdateCustom(f.id, v)}
                />
              ))}
            </div>
          </>
        )}

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Previous History</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill bg-[var(--color-bg)] text-[var(--color-text-secondary)]">Called {lead.timesCalled}x</span>
          <span className="pill border border-[var(--color-info)]/25 bg-[var(--color-info-tint)] text-[var(--color-info)]">{lead.lastDisposition}</span>
        </div>
        <div className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <p className="text-sm text-[var(--color-text-secondary)]">{lead.notes}</p>
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
        <div className="mt-2.5 space-y-2">
          {smsEnabled && (
            <button onClick={onOpenSms} className="btn-outline w-full">
              <MessageSquareText size={15} /> Send Confirmation SMS
            </button>
          )}
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

function LeadField({ label, value, onChange, placeholder, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="input-field" />
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

        <DispositionButton d={DISPOSITIONS[0]} selected={disposition === DISPOSITIONS[0].key} onClick={() => setDisposition(DISPOSITIONS[0].key)} large />

        <div className="mt-2 grid grid-cols-2 gap-2">
          {DISPOSITIONS.slice(1).map((d) => (
            <DispositionButton key={d.key} d={d} selected={disposition === d.key} onClick={() => setDisposition(d.key)} />
          ))}
        </div>

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
function ScriptPanel({ agentName, lead, script, loaded, expanded = false }) {
  const fill = (text) =>
    (text || "")
      .replaceAll("{agent_name}", agentName)
      .replaceAll("{lead_name}", lead.fullName)
      .replaceAll("{location}", `${lead.city}, ${lead.state}`);

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
          <p className={`mb-3 font-semibold text-[var(--color-text-primary)] transition-all duration-300 ${expanded ? "text-lg" : "text-base"}`}>
            {script.title}
          </p>
          <p
            className={`whitespace-pre-wrap rounded-lg bg-[var(--color-bg)] p-4 leading-relaxed text-[var(--color-text-primary)] transition-all duration-300 ${
              expanded ? "text-[17px]" : "text-[15px]"
            }`}
          >
            {fill(script.content)}
          </p>
        </>
      )}
    </div>
  );
}

const SOFTPHONE_STATUS_LABEL = {
  idle: "Softphone: Initializing…",
  connecting: "Softphone: Connecting…",
  registered: "Softphone: Registered",
  unregistered: "Softphone: Not Registered",
  disconnected: "Softphone: Disconnected",
  failed: "Softphone: Registration Failed",
};

const SOFTPHONE_STATUS_COLOR = {
  idle: "#6B7280",
  connecting: "#D97706",
  registered: "#059669",
  unregistered: "#6B7280",
  disconnected: "#DC2626",
  failed: "#DC2626",
};

function SoftphoneStatusPill({ status, error, onRetry }) {
  const color = SOFTPHONE_STATUS_COLOR[status] ?? "#6B7280";
  const canRetry = ["failed", "disconnected", "unregistered"].includes(status);
  return (
    <span className="flex items-center gap-1.5 text-xs" title={error || undefined}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-medium" style={{ color }}>
        {SOFTPHONE_STATUS_LABEL[status] ?? status}
      </span>
      {canRetry && onRetry && (
        <button onClick={onRetry} className="font-medium text-[var(--color-accent)] hover:underline">
          Retry
        </button>
      )}
    </span>
  );
}

function BottomBar({ campaignName, status, statusSince, softphoneStatus, softphoneError, onRetrySoftphone }) {
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-white px-6 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs text-[var(--color-text-secondary)]">
          Campaign: <span className="font-medium text-[var(--color-text-primary)]">{campaignName}</span>
        </span>
        <SoftphoneStatusPill status={softphoneStatus} error={softphoneError} onRetry={onRetrySoftphone} />
      </div>
      <StatusPill status={status} since={statusSince} size="sm" />
    </div>
  );
}

function SmsForm({ campaign, lead, agentName, smsNote, setSmsNote, sent, onSend }) {
  if (!campaign?.smsEnabled) return null;

  const filled = (campaign.smsTemplate || "")
    .replaceAll("{lead_name}", lead.fullName)
    .replaceAll("{street_address}", lead.street)
    .replaceAll("{city}", lead.city)
    .replaceAll("{state}", lead.state)
    .replaceAll("{zip_code}", lead.zip)
    .replaceAll("{agent_name}", agentName)
    .replaceAll("{appointment_time}", lead.customValues?.["cf-3"] || SMS_PREVIEW_SAMPLE["{appointment_time}"])
    .replaceAll("{company_name}", "10X Power Dialer");

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Message Preview</label>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text-primary)]">{filled}</div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Sending To</label>
        <input value={lead.phone} readOnly className="input-field bg-[var(--color-bg)]" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Add a short note (optional)</label>
        <textarea
          value={smsNote}
          onChange={(e) => setSmsNote(e.target.value)}
          rows={2}
          placeholder="Internal note about this SMS…"
          className="input-field resize-none"
        />
      </div>

      {sent ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-tint)] px-4 py-3 text-sm font-medium text-[var(--color-success)]">
          <Check size={16} /> SMS Sent ✓
        </div>
      ) : (
        <button onClick={onSend} className="btn-purple w-full py-3">
          Send
        </button>
      )}
    </div>
  );
}
