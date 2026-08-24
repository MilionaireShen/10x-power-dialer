import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// Exports are generated on the server by the same handlers that render the
// reports on screen, so a downloaded file cannot disagree with the report it
// came from. The history is the export_jobs table, not component state, so it
// survives a refresh and shows what was actually produced — including
// failures, which used to be impossible because nothing was ever produced.

function when(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function size(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ReportsExports() {
  const { notify } = useToast();
  const [reports, setReports] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);

  const loadHistory = useCallback(
    () =>
      adminService
        .listExports()
        .then((res) => setHistory(res?.data?.exports || []))
        .catch(() => {}),
    []
  );

  useEffect(() => {
    Promise.all([adminService.exportCatalogue().catch(() => null), loadHistory()])
      .then(([cat]) => setReports(cat?.data?.reports || []))
      .finally(() => setLoading(false));
  }, [loadHistory]);

  const runExport = async (report) => {
    setRunning(report.key);
    try {
      const res = await adminService.createExport({ report: report.key, format: "csv" });
      notify(res?.message || `${report.label} exported.`, "success");
      await loadHistory();
    } catch (err) {
      // The job is recorded as failed server-side either way, so the history
      // below will show it — the toast just surfaces it immediately.
      notify(err?.response?.data?.message || `Could not export ${report.label}.`, "error");
      await loadHistory();
    } finally {
      setRunning(null);
    }
  };

  // Downloaded through the authenticated client and handed to the browser as a
  // blob: a plain link would omit the auth header and come back a 401.
  const download = async (row) => {
    try {
      const blob = await adminService.downloadExport(row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.report_key}-${String(row.created_at).slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not download that export.", "error");
    }
  };

  return (
    <div>
      <ScreenHeader category="Reports" title="Exports" />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Available Reports</h2>
          {loading ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">No reports available to export.</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {reports.map((r) => (
                <div key={r.key} className="flex items-center justify-between py-3">
                  <span className="text-sm text-[var(--color-text-primary)]">{r.label}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => runExport(r)}
                      disabled={running === r.key}
                      className="btn-gray text-xs disabled:opacity-40"
                    >
                      {running === r.key ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Export History</h2>
          {loading ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">No exports yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{h.report_label}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {when(h.created_at)}
                      {h.status === "completed" && h.row_count != null ? ` · ${h.row_count} rows` : ""}
                      {h.byte_size ? ` · ${size(h.byte_size)}` : ""}
                    </p>
                    {h.status === "failed" && (
                      <p className="mt-0.5 text-xs text-[var(--color-danger)]">{h.error_message}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="pill text-[10px]">{String(h.format || "csv").toUpperCase()}</span>
                    {h.status === "completed" ? (
                      <button onClick={() => download(h)} title="Download" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)]">
                        <Download size={13} />
                      </button>
                    ) : (
                      <span className="pill bg-[var(--color-danger-tint)] text-[10px] text-[var(--color-danger)]">
                        {h.status}
                      </span>
                    )}
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
