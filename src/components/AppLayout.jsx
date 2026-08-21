import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import AdminSidebar from "./AdminSidebar";
import TopNav from "./TopNav";
import MonitoringBar from "./MonitoringBar";
import DidAlertBanner from "./DidAlertBanner";
import { useAuth } from "../lib/AuthContext";
import { useAppData } from "../lib/AppDataContext";
import { useSoftphone } from "../lib/softphone";
import { useAudioPrompt, LOGIN_PROMPT_SRC } from "../lib/audioPrompt";
import monitorService from "../services/monitorService";

// Auth + role enforcement happens per-route via RequireRole. This shell just
// provides the persistent chrome — agent/admin/manager/super_admin each get
// their own nav shell below.
export default function AppLayout() {
  const { user } = useAuth();

  if (user?.role === "agent") {
    return <AgentShell />;
  }

  // No chrome to render without a user (e.g. mid-logout) — just let the
  // matched route's RequireRole redirect to the right login page.
  if (!user) {
    return <Outlet />;
  }

  return <AdminShell />;
}

// Owns the collapse state and the two overlay-panel triggers (Dashboard /
// Leaderboard) so both the Sidebar (which fires them) and the routed
// AgentDashboard (which renders the panels + reacts to the collapse state
// for the script's width) share one source of truth for the session.
function AgentShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openPanel, setOpenPanel] = useState(null); // "dashboard" | "leaderboard" | null

  // Lifted up here (rather than inside AgentDashboard) so the WebRTC
  // registration survives regardless of which agent page/panel is
  // mounted underneath — it's tied to the agent's session, not to one
  // particular route.
  const softphone = useSoftphone({ enabled: true });

  // Audio-connectivity prompt. Tied to the softphone actually being
  // registered with a usable mic — not merely to being logged in — because
  // its whole purpose is to prove the audio path works before the agent
  // takes a real call. sessionId changes per login, which is what allows it
  // to play again after a logout without replaying on every re-render.
  const { sessionId } = useAuth();
  const { promptRef, promptState, testAudio } = useAudioPrompt({
    ready: softphone.status === "registered" && !softphone.micBlocked,
    sessionKey: sessionId,
    callAudioRef: softphone.remoteAudioRef,
  });

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Remote call audio only — local mic capture is handled internally
          by SIP.js via getUserMedia, nothing to render for it. */}
      <audio ref={softphone.remoteAudioRef} autoPlay style={{ display: "none" }} />
      {/* Separate from the call element above: that one's srcObject belongs
          to SIP.js, so giving it a src would disturb live call media. */}
      <audio ref={promptRef} src={LOGIN_PROMPT_SRC} preload="auto" style={{ display: "none" }} />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onReopen={() => setSidebarOpen(true)}
        onOpenPanel={(key) => setOpenPanel(key)}
        openPanel={openPanel}
        softphoneStatus={softphone.status}
        softphoneError={softphone.statusError}
        micBlocked={softphone.micBlocked}
        onRetrySoftphone={softphone.retry}
        audioPromptState={promptState}
        onTestAudio={testAudio}
      />
      <main className="min-w-0 flex-1">
        <Outlet context={{ sidebarOpen, openPanel, closePanel: () => setOpenPanel(null), softphone }} />
      </main>
    </div>
  );
}

const MONITOR_MODE_ACTION = { listen: monitorService.listen, whisper: monitorService.whisper, barge: monitorService.barge };

function AdminShell() {
  const { monitoringSessions, stopMonitoring, switchMonitoringMode } = useAppData();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        {monitoringSessions.map((session, i) => (
          <MonitoringBar
            key={session.id}
            session={session}
            index={i}
            onStop={() => {
              monitorService.stop(session.agentId).catch(() => {});
              stopMonitoring(session.id);
            }}
            onSwitchMode={(type) => {
              MONITOR_MODE_ACTION[type]?.(session.agentId).catch(() => {});
              switchMonitoringMode(session.id, type);
            }}
          />
        ))}
        <DidAlertBanner />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
