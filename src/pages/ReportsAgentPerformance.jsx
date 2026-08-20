import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import ExportActions from "../components/ExportActions";
import reportService from "../services/reportService";

export default function ReportsAgentPerformance() {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reportService
      .agentPerformance({})
      .then((res) => {
        if (cancelled) return;
        setRows([...(res.data || [])].sort((a, b) => b.total_calls - a.total_calls));
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
      <ScreenHeader category="Reports" title="Agent Performance" actions={<ExportActions reportPath="/reports/agent-performance" filename="agent-performance.csv" />} />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Calls</th>
                <th className="px-5 py-3 font-medium">Connects</th>
                <th className="px-5 py-3 font-medium">Booked</th>
                <th className="px-5 py-3 font-medium">Avg. Duration</th>
                <th className="px-5 py-3 font-medium">Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {loaded && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">
                    No call activity in the last 30 days.
                  </td>
                </tr>
              )}
              {rows.map((a, i) => (
                <tr key={a.agent_id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{a.agent_name}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{a.total_calls}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{a.connects}</td>
                  <td className="px-5 py-3.5 text-[var(--color-success)]">{a.dispositions_breakdown?.["Booked Appointment"] || 0}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">
                    {Math.floor(a.avg_call_duration_seconds / 60)}:{String(a.avg_call_duration_seconds % 60).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-accent)]">{a.conversion_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
