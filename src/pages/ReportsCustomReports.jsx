import { useCallback, useEffect, useState } from "react";
import { Plus, FileText, Trash2, Play, AlertTriangle } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// A saved report stores only the definition. The numbers are computed from
// calls every time it is run, so a saved report can never hand back a figure
// that was true when it was created and is not true now.
const METRIC_LABEL = {
  calls: "Calls",
  connects: "Connects",
  talk_time: "Talk time (minutes)",
  appointments: "Appointments",
  answer_rate: "Answer rate (%)",
  avg_duration: "Average duration (seconds)",
};

const GROUP_LABEL = {
  agent: "Agent", campaign: "Campaign", disposition: "Disposition",
  day: "Day", direction: "Direction", did: "Number",
};

export default function ReportsCustomReports() {
  const { notify } = useToast();
  const [reports, setReports] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [metric, setMetric] = useState("calls");
  const [groupBy, setGroupBy] = useState("agent");

  const [running, setRunning] = useState(null);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminService.listCustomReports();
      setReports(res?.data?.reports || []);
      setMetrics(res?.data?.metrics || []);
      setGroups(res?.data?.group_by_options || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load saved reports.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim()) {
      notify("Give the report a name first.", "warning");
      return;
    }
    setSaving(true);
    try {
      await adminService.createCustomReport({ name: name.trim(), metric, group_by: groupBy });
      notify(`Custom report "${name.trim()}" saved.`, "success");
      setName("");
      setOpen(false);
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save the report.", "error");
    } finally {
      setSaving(false);
    }
  };

  const run = async (report) => {
    setRunning(report.id);
    setResult(null);
    try {
      const res = await adminService.runCustomReport(report.id);
      setResult(res?.data || null);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not run the report.", "error");
    } finally {
      setRunning(null);
    }
  };

  const remove = async (report) => {
    try {
      await adminService.deleteCustomReport(report.id);
      notify(`"${report.name}" deleted.`, "success");
      if (result?.report?.id === report.id) setResult(null);
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not delete the report.", "error");
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Reports"
        title="Custom Reports"
        actions={
          <button onClick={() => setOpen(true)} className="btn-purple">
            <Plus size={15} /> New Custom Report
          </button>
        }
      />
      <div className="space-y-6 p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : error ? (
          <EmptyState icon={FileText} title="Could not load saved reports" description={error} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No custom reports yet"
            description="Build one to track a metric grouped the way you want."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <div key={r.id} className="card">
                <div className="mb-2 flex items-center gap-2">
                  <FileText size={15} className="text-[var(--color-accent)]" />
                  <p className="font-medium text-[var(--color-text-primary)]">{r.name}</p>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {METRIC_LABEL[r.metric] || r.metric} grouped by {GROUP_LABEL[r.group_by] || r.group_by}
                </p>
                <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                  Created {new Date(r.created_at).toLocaleDateString()}
                  {r.created_by_name ? ` by ${r.created_by_name}` : ""}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
                  <button onClick={() => run(r)} disabled={running === r.id} className="btn-outline py-1.5 text-xs disabled:opacity-40">
                    <Play size={13} /> {running === r.id ? "Running…" : "Run"}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)]"
                    aria-label="Delete report"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className="card">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{result.report.name}</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">{result.date_from} to {result.date_to}</p>
            </div>

            {/* Some pairings cannot be answered from the data — an appointment
                has no direction or disposition. Said outright, rather than
                returning nothing and implying there were none. */}
            {result.unsupported_combination ? (
              <p className="flex items-start gap-2 text-sm text-[var(--color-warning)]">
                <AlertTriangle size={14} className="mt-px shrink-0" />
                {result.unsupported_combination}
              </p>
            ) : result.rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-text-tertiary)]">
                No data available for this period.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    <th className="py-2 font-medium">{GROUP_LABEL[result.report.group_by] || result.report.group_by}</th>
                    <th className="py-2 font-medium">{METRIC_LABEL[result.report.metric] || result.report.metric}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.group} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-2.5 text-[var(--color-text-primary)]">{row.group}</td>
                      <td className="py-2.5 font-medium text-[var(--color-text-secondary)]">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <SidePanel open={open} onClose={() => setOpen(false)} title="New Custom Report" subtitle="Pick a metric and how to group it">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Report Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Conversion by Campaign" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Metric</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className="input-field">
              {metrics.map((m) => <option key={m} value={m}>{METRIC_LABEL[m] || m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Group By</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input-field">
              {groups.map((g) => <option key={g} value={g}>{GROUP_LABEL[g] || g}</option>)}
            </select>
          </div>
          <button onClick={save} disabled={saving || !name.trim()} className="btn-purple w-full disabled:opacity-40">
            {saving ? "Saving…" : "Save Custom Report"}
          </button>
        </div>
      </SidePanel>
    </div>
  );
}
