import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import ExportActions from "../components/ExportActions";
import reportService from "../services/reportService";

export default function ReportsDispositionReports() {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reportService
      .dispositionReport({})
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
      <ScreenHeader category="Reports" title="Disposition Reports" actions={<ExportActions reportPath="/reports/disposition-report" filename="disposition-report.csv" />} />
      <div className="p-8">
        {loaded && rows.length === 0 ? (
          <div className="card text-sm text-[var(--color-text-tertiary)]">No calls in the last 30 days.</div>
        ) : (
          <div className="card divide-y divide-[var(--color-border)] p-0">
            {rows.map((d) => (
              <div key={d.disposition} className="flex items-center gap-4 px-5 py-4">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color || "var(--color-text-tertiary)" }} />
                <p className="w-56 shrink-0 font-medium text-[var(--color-text-primary)]">{d.label}</p>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
                  <div className="h-full rounded-full" style={{ width: `${d.percentage}%`, backgroundColor: d.color || "var(--color-text-tertiary)" }} />
                </div>
                <span className="w-16 shrink-0 text-right text-sm text-[var(--color-text-secondary)]">{d.count} calls</span>
                <span className="w-12 shrink-0 text-right text-sm font-medium text-[var(--color-text-primary)]">{d.percentage}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
