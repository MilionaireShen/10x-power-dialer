import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import ExportActions from "../components/ExportActions";
import reportService from "../services/reportService";

function secondsToHMS(seconds) {
  const total = Math.round(seconds || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function minutesToHMS(minutes) {
  return secondsToHMS((minutes || 0) * 60);
}

function timeOfDay(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ReportsProductivityLogs() {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reportService
      .agentProductivity({})
      .then((res) => {
        if (!cancelled) setRows(res.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <ScreenHeader category="Reports" title="Agent Productivity Logs" actions={<ExportActions reportPath="/reports/agent-productivity" filename="agent-productivity.csv" />} />
      <div className="p-8 space-y-3">
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Online, Available, Dialing and Talk are tracked separately from real
          agent state transitions and answered-call timestamps. Dialing counts
          only active dialing work (manual/auto dial, ringing, live call) — not
          time sitting Available.
        </p>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Login</th>
                <th className="px-4 py-3 font-medium">Logout</th>
                <th className="px-4 py-3 font-medium">Online</th>
                <th className="px-4 py-3 font-medium">Available</th>
                <th className="px-4 py-3 font-medium">Dialing</th>
                <th className="px-4 py-3 font-medium">Talk</th>
                <th className="px-4 py-3 font-medium">Wrap</th>
                <th className="px-4 py-3 font-medium">Calls</th>
                <th className="px-4 py-3 font-medium">Connects</th>
              </tr>
            </thead>
            <tbody>
              {loaded && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-[var(--color-text-tertiary)]">
                    No activity recorded for this period.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={`${r.agent_id}-${r.date}`} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-4 py-3.5 font-medium text-[var(--color-text-primary)]">{r.agent_name}</td>
                  <td className="px-4 py-3.5 text-[var(--color-text-secondary)]">{r.date}</td>
                  <td className="px-4 py-3.5 text-[var(--color-text-secondary)]">{timeOfDay(r.login_time)}</td>
                  <td className="px-4 py-3.5 text-[var(--color-text-secondary)]">{timeOfDay(r.logout_time)}</td>
                  <td className="px-4 py-3.5 font-mono text-[var(--color-text-primary)]">{secondsToHMS(r.online_seconds)}</td>
                  <td className="px-4 py-3.5 font-mono text-[var(--color-text-secondary)]">{secondsToHMS(r.available_seconds)}</td>
                  <td className="px-4 py-3.5 font-mono text-[var(--color-text-secondary)]">{secondsToHMS(r.dialing_seconds)}</td>
                  <td className="px-4 py-3.5 font-mono text-[var(--color-text-secondary)]">{secondsToHMS(r.talk_seconds)}</td>
                  <td className="px-4 py-3.5 font-mono text-[var(--color-text-secondary)]">{r.wrap_seconds != null ? secondsToHMS(r.wrap_seconds) : minutesToHMS(r.wrap_up_time_minutes)}</td>
                  <td className="px-4 py-3.5 text-[var(--color-text-secondary)]">{r.calls_made}</td>
                  <td className="px-4 py-3.5 text-[var(--color-text-secondary)]">{r.connects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
