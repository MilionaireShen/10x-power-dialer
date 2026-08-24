import { useState } from "react";
import SidePanel from "../components/SidePanel";
import { useAppData } from "./AppDataContext";
import { useToast } from "./ToastContext";
import monitorService from "../services/monitorService";
import adminService from "../services/adminService";

const MONITOR_ACTION = { listen: monitorService.listen, whisper: monitorService.whisper, barge: monitorService.barge };
const MONITOR_VERB = { listen: "listening", whisper: "whispering", barge: "barge" };

// Only statuses the backend will accept. 'manual_dial' is deliberately absent:
// it describes an agent who has started dialling, not a state a supervisor can
// put someone into, and the server rejects it.
const FORCE_STATUS_OPTIONS = ["available", "unready", "lunch", "break", "training", "dnd", "logged_out"];
const FORCE_STATUS_LABEL = {
  available: "Available",
  unready: "Unready",
  lunch: "Lunch",
  break: "Break",
  training: "Training",
  dnd: "Do Not Disturb",
  logged_out: "Logged Out",
};

// Shared Listen/Whisper/Barge + three-dot-menu action handling, used by
// every screen that renders agent rows (Agent Monitor, Live Calls).
//
// Messages, forced statuses and forced logouts now go to the server. They
// previously updated React state, which meant they reached only the tab the
// supervisor was sitting in — the agent, on another machine, saw nothing.
export function useAgentActions() {
  const { startMonitoring, stopMonitoring } = useAppData();
  const { notify } = useToast();
  const [messageTarget, setMessageTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [queueTarget, setQueueTarget] = useState(null);
  const [queue, setQueue] = useState({ loading: false, rows: [], error: null });

  const handleMonitor = (agent, type) => {
    if (agent.status !== "on_call") {
      notify(`${agent.name} is not currently on a call.`, "warning");
      return;
    }
    const sessionId = startMonitoring(user_label(agent), agent.name, type, agent.id);
    MONITOR_ACTION[type]?.(agent.id).catch((err) => {
      notify(err?.message || `Could not start ${MONITOR_VERB[type]} for ${agent.name}.`, "error");
      stopMonitoring(sessionId);
    });
    notify(`${type === "listen" ? "Listening to" : type === "whisper" ? "Whispering to" : "Barged into"} ${agent.name}'s call.`, "info");
  };

  const forceLogout = async (agent) => {
    try {
      await adminService.forceLogoutAgent(agent.id);
      notify(`${agent.name} has been logged out.`, "warning");
    } catch (err) {
      // A 409 here is the server refusing to drop a live customer — worth
      // showing verbatim rather than flattening into a generic failure.
      notify(err?.response?.data?.message || `Could not log ${agent.name} out.`, "error");
    }
  };

  const openQueue = async (agent) => {
    setQueueTarget(agent);
    setQueue({ loading: true, rows: [], error: null });
    try {
      const res = await adminService.listCallbacks({ agent_id: agent.id, page_size: 100 });
      setQueue({ loading: false, rows: res?.data?.callbacks || [], error: null });
    } catch (err) {
      setQueue({ loading: false, rows: [], error: err?.response?.data?.message || "Could not load this agent's callbacks." });
    }
  };

  const handleAgentAction = (agent, action) => {
    if (action === "Listen to Call") return handleMonitor(agent, "listen");
    if (action === "Whisper to Agent") return handleMonitor(agent, "whisper");
    if (action === "Barge Into Call") return handleMonitor(agent, "barge");
    if (action === "Force Logout") return forceLogout(agent);
    if (action === "Send Message to Agent") return setMessageTarget(agent);
    if (action === "Force Status Change") return setStatusTarget(agent);
    if (action === "View Agent's Callback Queue") return openQueue(agent);
    return undefined;
  };

  const sendMessage = async (text) => {
    try {
      await adminService.messageAgent({ agent_id: messageTarget.id, body: text });
      notify(`Message sent to ${messageTarget.name}.`, "success");
      setMessageTarget(null);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not send that message.", "error");
    }
  };

  const applyStatus = async (status) => {
    try {
      await adminService.forceAgentStatus(statusTarget.id, status);
      notify(`${statusTarget.name}'s status changed to "${FORCE_STATUS_LABEL[status]}".`, "warning");
      setStatusTarget(null);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not change that agent's status.", "error");
    }
  };

  const panels = (
    <>
      <SidePanel open={Boolean(messageTarget)} onClose={() => setMessageTarget(null)} title={messageTarget ? `Message ${messageTarget.name}` : ""} subtitle="Appears as a pop-up on their screen">
        <MessageForm onSend={sendMessage} />
      </SidePanel>

      <SidePanel open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} title={statusTarget ? `Force Status: ${statusTarget.name}` : ""} subtitle="Change this agent's status remotely">
        <div className="space-y-2">
          {FORCE_STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => applyStatus(s)}
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
            {queue.loading ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
            ) : queue.error ? (
              <p className="text-sm text-[var(--color-danger)]">{queue.error}</p>
            ) : queue.rows.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">No callbacks scheduled for this agent.</p>
            ) : (
              queue.rows.map((c) => (
                <div key={c.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {[c.lead?.first_name, c.lead?.last_name].filter(Boolean).join(" ") || c.lead?.phone_number || "—"}
                    </p>
                    <span className="pill text-[10px]">{c.status}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{new Date(c.scheduled_for).toLocaleString()}</p>
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

// The monitoring bar labels the session with whoever started it; the agent row
// carries no supervisor name, so the supervisor's own is not available here
// and the bar uses a neutral label instead of inventing one.
function user_label() {
  return "You";
}

function MessageForm({ onSend }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
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
        onClick={async () => {
          if (!text.trim()) return;
          setSending(true);
          await onSend(text);
          setSending(false);
          setText("");
        }}
        disabled={sending}
        className="btn-purple mt-4 w-full disabled:opacity-40"
      >
        {sending ? "Sending…" : "Send Message"}
      </button>
    </>
  );
}
