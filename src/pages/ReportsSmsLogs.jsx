import ScreenHeader from "../components/ScreenHeader";
import ExportActions from "../components/ExportActions";
import { useAppData } from "../lib/AppDataContext";

export default function ReportsSmsLogs() {
  const { smsLog } = useAppData();
  const sorted = [...smsLog].sort((a, b) => b.sentAt - a.sentAt);

  return (
    <div>
      <ScreenHeader category="Reports" title="SMS Logs" actions={<ExportActions />} />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Sent</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{new Date(s.sentAt).toLocaleString()}</td>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{s.agentName}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{s.leadName}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{s.phone}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{s.campaign}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="pill"
                      style={{
                        backgroundColor: s.status === "Delivered" ? "var(--color-success-tint)" : "var(--color-danger-tint)",
                        color: s.status === "Delivered" ? "var(--color-success)" : "var(--color-danger)",
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
