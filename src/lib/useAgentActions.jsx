import { useState } from "react";
import SidePanel from "../components/SidePanel";
import { useAppData } from "./AppDataContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import monitorService from "../services/monitorService";

const MONITOR_ACTION = { listen: monitorService.listen, whisper: monitorService.whisper, barge: monitorService.barge };
const MONITOR_VERB = { listen: "listening", whisper: "whispering", barge: "barge" };

const FORCE_STATUS_OPTIONS = ["available", "unready", "lunch", "break", "manual_dial", "logged_out"];
const FORCE_STATUS_LABEL = {
  available: "Available",
  unready: "Unready",
  lunch: "Lunch",
  break: "Break",
  manual_dial: "Manual Dial",
  logged_out: "Logged Out",
};

// Shared Listen/Whisper/Barge + three-dot-menu action handling, used by
// every screen that renders agent rows (Agent Monitor, Live Calls). Keeps
// the monitoring/message/force-status/callback-queue panels defined once.
export function useAgentActions() {
  const { user } = useAuth();
  const { callbacks, startMonitoring, stopMonitoring, sendAgentMessage, forceAgentStatus, forceAgentLogout } = useAppData();
  const { notify } = useToast();
  const [messageTarget, setMessageTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [queueTarget, setQueueTarget] = useState(null);

  const handleMonitor = (agent, type) => {
    if (agent.status !== "on_call") {
      notify(`${agent.name} is not currently on a call.`, "warning");
      return;
    }
    const sessionId = startMonitoring(user.name, agent.name, type, agent.id);
    MONITOR_ACTION[type]?.(agent.id).catch((err) => {
      notify(err?.message || `Could not start ${MONITOR_VERB[type]} for ${agent.name}.`, "error");
      stopMonitoring(sessionId);
    });
    notify(`${type === "listen" ? "Listening to" : type === "whisper" ? "Whispering to" : "Barged into"} ${agent.name}'s call.`, "info");
  };

  const handleAgentAction = (agent, action) => {
    if (action === "Listen to Call") return handleMonitor(agent, "listen");
    if (action === "Whisper to Agent") return handleMonitor(agent, "whisper");
    if (action === "Barge Into Call") return handleMonitor(agent, "barge");
    if (action === "Force Logout") {
      forceAgentLogout(user.name, agent.name);
      notify(`${agent.name} has been force logged out.`, "error");
      return;
    }
    if (action === "Send Message to Agent") return setMessageTarget(agent);
    if (action === "Force Status Change") return setStatusTarget(agent);
    if (action === "View Agent's Callback Queue") return setQueueTarget(agent);
  };

  const panels = (
    <>
      <SidePanel open={Boolean(messageTarget)} onClose={() => setMessageTarget(null)} title={messageTarget ? `Message ${messageTarget.name}` : ""} subtitle="Appears as a pop-up on their screen">
        <MessageForm
          onSend={(text) => {
            sendAgentMessage(user.name, messageTarget.name, text);
            notify(`Message sent to ${messageTarget.name}.`, "success");
            setMessageTarget(null);
          }}
        />
      </SidePanel>

      <SidePanel open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} title={statusTarget ? `Force Status: ${statusTarget.name}` : ""} subtitle="Change this agent's status remotely">
        <div className="space-y-2">
          {FORCE_STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                forceAgentStatus(user.name, statusTarget.name, s);
                notify(`${statusTarget.name}'s status forced to "${FORCE_STATUS_LABEL[s]}".`, "warning");
                setStatusTarget(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-tint)] transition-colors"
            >
              {FORCE_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </SidePanel>

      <SidePanel open={Boolean(queueTarget)} onClose={() => setQueueTarget(null)} title={queueTarget ? `${queueTarget.name}'s Callback Queue` : ""} subtitle="All pending and past callbacks for this agent">
        {queueTarget && (
          <div className="space-y-2">
            {callbacks.filter((c) => c.agentName === queueTarget.name).length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">No callbacks scheduled for this agent.</p>
            ) : (
              callbacks
                .filter((c) => c.agentName === queueTarget.name)
                .sort((a, b) => b.scheduledAt - a.scheduledAt)
                .map((c) => (
                  <div key={c.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{c.leadName}</p>
                      <span className="pill text-[10px]">{c.status}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{new Date(c.scheduledAt).toLocaleString()}</p>
                  </div>
                ))
            )}
          </div>
        )}
      </SidePanel>
    </>
  );

  return { handleMonitor, handleAgentAction, panels };
}

function MessageForm({ onSend }) {
  const [text, setText] = useState("");
  return (
    <>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="e.g. Great job on that last call — keep it up!"
        className="input-field resize-none"
      />
      <button
        onClick={() => {
          if (!text.trim()) return;
          onSend(text);
          setText("");
        }}
        className="btn-purple mt-4 w-full"
      >
        Send Message
      </button>
    </>
  );
}
