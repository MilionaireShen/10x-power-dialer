import { useEffect, useState } from "react";
import { Headphones, Radio, LogIn, PhoneCall } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import Avatar from "../components/Avatar";
import { AGENTS } from "../data/mockData";
import { secondsSince, formatHMS } from "../lib/statusColors";
import { useAgentActions } from "../lib/useAgentActions";

export default function CallCenterLiveCalls() {
  const { handleMonitor, panels } = useAgentActions();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const liveCalls = AGENTS.filter((a) => a.status === "on_call");

  return (
    <div>
      <ScreenHeader
        category="Call Center"
        title="Live Calls"
        actions={
          <span className="pill bg-[var(--color-success-tint)] text-[var(--color-success)]">
            {liveCalls.length} calls in progress
          </span>
        }
      />
      <div className="p-8">
        <div className="card overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Lead Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-5 py-3 font-medium">Call Type</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Monitor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {liveCalls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[var(--color-text-tertiary)]">
                    No calls in progress right now.
                  </td>
                </tr>
              )}
              {liveCalls.map((a) => (
                <tr key={a.id} className="hover:bg-[var(--color-bg)]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.name} size={26} />
                      <span className="font-medium text-[var(--color-text-primary)]">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-primary)]">{a.leadName ?? "—"}</td>
                  <td className="px-5 py-3 text-[var(--color-text-secondary)]">{a.leadPhone ?? "—"}</td>
                  <td className="px-5 py-3 text-[var(--color-text-secondary)]">{a.campaign}</td>
                  <td className="px-5 py-3">
                    <span className="pill text-[11px]">
                      <PhoneCall size={11} className="mr-1 inline" />
                      {a.callType}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[var(--color-text-primary)]">{formatHMS(secondsSince(a.statusSince))}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleMonitor(a, "listen")} title="Listen" className="rounded-md p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-accent-tint)] hover:text-[var(--color-accent)]">
                        <Headphones size={14} />
                      </button>
                      <button onClick={() => handleMonitor(a, "whisper")} title="Whisper" className="rounded-md p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-accent-tint)] hover:text-[var(--color-accent)]">
                        <Radio size={14} />
                      </button>
                      <button onClick={() => handleMonitor(a, "barge")} title="Barge" className="rounded-md p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-accent-tint)] hover:text-[var(--color-accent)]">
                        <LogIn size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {panels}
    </div>
  );
}
