import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

const METRICS = ["Calls", "Connects", "Appointments", "Conversion Rate", "Auto-Logouts", "Callback Volume"];
const GROUP_BY = ["Agent", "Campaign", "Disposition", "Day"];

export default function ReportsCustomReports() {
  const { customReports, addCustomReport } = useAppData();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [metric, setMetric] = useState(METRICS[0]);
  const [groupBy, setGroupBy] = useState(GROUP_BY[0]);

  const save = () => {
    if (!name.trim()) {
      notify("Give the report a name first.", "warning");
      return;
    }
    addCustomReport({ name, metric, groupBy });
    notify(`Custom report "${name}" saved.`, "success");
    setName("");
    setOpen(false);
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
      <div className="p-8">
        {customReports.length === 0 ? (
          <div className="card py-16 text-center text-sm text-[var(--color-text-tertiary)]">
            No custom reports yet. Build one to track a metric grouped the way you want.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customReports.map((r) => (
              <div key={r.id} className="card">
                <div className="mb-2 flex items-center gap-2">
                  <FileText size={15} className="text-[var(--color-accent)]" />
                  <p className="font-medium text-[var(--color-text-primary)]">{r.name}</p>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {r.metric} grouped by {r.groupBy}
                </p>
                <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">Created {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
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
              {METRICS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Group By</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input-field">
              {GROUP_BY.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <button onClick={save} className="btn-purple w-full">
            Save Custom Report
          </button>
        </div>
      </SidePanel>
    </div>
  );
}
