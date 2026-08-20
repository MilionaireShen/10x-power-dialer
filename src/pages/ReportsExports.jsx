import { useState } from "react";
import { Download, FileSpreadsheet, FileText as FileIcon } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";

const EXPORTABLE_REPORTS = [
  "Agent Performance",
  "Call Logs",
  "Campaign Reports",
  "Disposition Reports",
  "Callback Reports",
  "SMS Logs",
];

export default function ReportsExports() {
  const { notify } = useToast();
  const [history, setHistory] = useState([
    { id: "exp-1", name: "Agent Performance", format: "CSV", createdAt: Date.now() - 1000 * 60 * 60 * 20 },
    { id: "exp-2", name: "Call Logs", format: "PDF", createdAt: Date.now() - 1000 * 60 * 60 * 44 },
  ]);

  const runExport = (name, format) => {
    setHistory((prev) => [{ id: `exp-${Date.now()}`, name, format, createdAt: Date.now() }, ...prev]);
    notify(`${name} exported as ${format} (demo).`, "success");
  };

  return (
    <div>
      <ScreenHeader category="Reports" title="Exports" />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Available Reports</h2>
          <div className="divide-y divide-[var(--color-border)]">
            {EXPORTABLE_REPORTS.map((r) => (
              <div key={r} className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--color-text-primary)]">{r}</span>
                <div className="flex gap-2">
                  <button onClick={() => runExport(r, "CSV")} className="btn-gray text-xs">
                    <FileSpreadsheet size={13} /> CSV
                  </button>
                  <button onClick={() => runExport(r, "PDF")} className="btn-gray text-xs">
                    <FileIcon size={13} /> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Export History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">No exports yet this session.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{h.name}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{new Date(h.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pill text-[10px]">{h.format}</span>
                    <Download size={13} className="text-[var(--color-text-tertiary)]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
