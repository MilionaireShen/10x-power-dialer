import { useState } from "react";
import { Megaphone } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { AGENTS } from "../data/mockData";
import { useToast } from "../lib/ToastContext";

export default function CallCenterBroadcast() {
  const { notify } = useToast();
  const [message, setMessage] = useState("");
  const [sentLog, setSentLog] = useState([]);

  const sendBroadcast = () => {
    if (!message.trim()) {
      notify("Write a message before broadcasting.", "warning");
      return;
    }
    notify(`Broadcast sent to ${AGENTS.length} logged-in agents.`, "success", { title: "Broadcast Sent" });
    setSentLog((prev) => [{ id: `bc-${Date.now()}`, text: message, sentAt: Date.now() }, ...prev]);
    setMessage("");
  };

  return (
    <div>
      <ScreenHeader category="Call Center" title="Broadcast Message" />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Compose Broadcast</h2>
          </div>
          <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">Sends instantly to all {AGENTS.length} logged-in agents as a pop-up on their screen.</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="e.g. Great work this morning team — keep the energy up! New leads just loaded into Solar Homeowner Outreach."
            className="input-field resize-none"
          />
          <button onClick={sendBroadcast} className="btn-purple mt-4 w-full">
            Send Broadcast
          </button>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Recent Broadcasts</h2>
          {sentLog.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">No broadcasts sent yet this session.</p>
          ) : (
            <div className="space-y-2">
              {sentLog.map((b) => (
                <div key={b.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                  <p className="text-sm text-[var(--color-text-primary)]">{b.text}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{new Date(b.sentAt).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
