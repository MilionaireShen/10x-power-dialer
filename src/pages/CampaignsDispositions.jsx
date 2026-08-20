import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

const COLOR_CHOICES = ["#10B981", "#3B82F6", "#EF4444", "#6B7280", "#5B3FE0", "#F59E0B", "#991B1B", "#14B8A6"];

export default function CampaignsDispositions() {
  const { dispositions, setDispositions } = useAppData();
  const { notify } = useToast();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLOR_CHOICES[0]);

  const addDisposition = () => {
    if (!label.trim()) {
      notify("Name the disposition before adding it.", "warning");
      return;
    }
    setDispositions((prev) => [...prev, { key: label.toLowerCase().replace(/\s+/g, "_"), label, color }]);
    notify(`Disposition "${label}" added.`, "success");
    setLabel("");
  };

  const removeDisposition = (key) => {
    setDispositions((prev) => prev.filter((d) => d.key !== key));
  };

  return (
    <div>
      <ScreenHeader category="Campaigns" title="Dispositions" />
      <div className="p-8 space-y-6">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Add Disposition</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Left Voicemail" className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Color</label>
              <div className="flex gap-1.5">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="h-8 w-8 rounded-full border-2 transition-transform"
                    style={{ backgroundColor: c, borderColor: color === c ? "var(--color-text-primary)" : "transparent" }}
                  />
                ))}
              </div>
            </div>
            <button onClick={addDisposition} className="btn-purple">
              <Plus size={15} /> Add
            </button>
          </div>
        </div>

        <div className="card divide-y divide-[var(--color-border)] p-0">
          {dispositions.map((d) => (
            <div key={d.key} className="flex items-center gap-3 px-5 py-3.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">{d.label}</span>
              <button onClick={() => removeDisposition(d.key)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]" aria-label="Delete disposition">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
