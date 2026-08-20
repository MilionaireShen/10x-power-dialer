import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import ExportActions from "../components/ExportActions";
import reportService from "../services/reportService";

function minutesToHMS(minutes) {
  const totalSeconds = Math.round((minutes || 0) * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Total Hours</th>
                <th className="px-5 py-3 font-medium">Calls Made</th>
                <th className="px-5 py-3 font-medium">Connects</th>
                <th className="px-5 py-3 font-medium">Wrap-Up Time</th>
                <th className="px-5 py-3 font-medium">Break Time</th>
              </tr>
            </thead>
            <tbody>
              {loaded && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">
                    No productivity data in the last 30 days.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={`${r.agent_id}-${r.date}`} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{r.agent_name}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{r.date}</td>
                  <td className="px-5 py-3.5 font-mono text-[var(--color-text-secondary)]">{r.total_hours.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{r.calls_made}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{r.connects}</td>
                  <td className="px-5 py-3.5 font-mono text-[var(--color-text-secondary)]">{minutesToHMS(r.wrap_up_time_minutes)}</td>
                  <td className="px-5 py-3.5 font-mono text-[var(--color-text-secondary)]">{minutesToHMS(r.break_time_minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
