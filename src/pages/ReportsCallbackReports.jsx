import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import ExportActions from "../components/ExportActions";
import reportService from "../services/reportService";

const STATUS_STYLE = {
  pending: { bg: "var(--color-info-tint)", color: "var(--color-info)", label: "Pending" },
  completed: { bg: "var(--color-success-tint)", color: "var(--color-success)", label: "Completed" },
  dismissed: { bg: "var(--color-danger-tint)", color: "var(--color-danger)", label: "Dismissed" },
  missed: { bg: "var(--color-warning-tint)", color: "var(--color-warning)", label: "Missed" },
};

export default function ReportsCallbackReports() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    reportService
      .callbackReport({})
      .then((res) => {
        if (!cancelled) setSummary(res.data?.[0] || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = ["pending", "completed", "dismissed", "missed"].map((status) => ({
    status,
    count: summary?.[status] ?? 0,
  }));

  return (
    <div>
      <ScreenHeader category="Reports" title="Callback Reports" actions={<ExportActions reportPath="/reports/callback-report" filename="callback-report.csv" />} />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {counts.map((c) => (
            <div key={c.status} className="card">
              <p className="text-2xl font-semibold" style={{ color: STATUS_STYLE[c.status].color }}>
                {c.count}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{STATUS_STYLE[c.status].label}</p>
            </div>
          ))}
        </div>

        {summary && (
          <div className="card flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Total scheduled (last 30 days)</span>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{summary.total_scheduled}</span>
          </div>
        )}
        {summary && (
          <div className="card flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Dismissal rate</span>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{summary.dismissal_rate}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
