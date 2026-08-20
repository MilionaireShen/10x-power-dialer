import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";

export default function ReportsActivityLog() {
  const { activityLog } = useAppData();

  return (
    <div>
      <ScreenHeader category="Reports" title="Admin Activity Log" />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          {activityLog.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-tertiary)]">
              No admin monitoring or account actions logged yet this session.
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                  <th className="px-5 py-3 font-medium">Admin</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Target Agent</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {activityLog.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{new Date(entry.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{entry.admin}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{entry.action}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{entry.targetAgent}</td>
                    <td className="max-w-[260px] truncate px-5 py-3.5 text-[var(--color-text-tertiary)]">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
