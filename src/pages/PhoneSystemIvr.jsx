import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function PhoneSystemIvr() {
  const { ivrRules, addIvrRule, removeIvrRule } = useAppData();
  const { notify } = useToast();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [routesTo, setRoutesTo] = useState("");

  const add = () => {
    if (!key.trim() || !label.trim()) {
      notify("Enter a key and a label for the IVR option.", "warning");
      return;
    }
    addIvrRule({ key, label, routesTo });
    notify(`IVR option "${label}" added.`, "success");
    setKey("");
    setLabel("");
    setRoutesTo("");
  };

  return (
    <div>
      <ScreenHeader category="Phone System" title="IVR Settings" />
      <div className="p-8 space-y-6">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Add Menu Option</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-20">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Key</label>
              <input value={key} onChange={(e) => setKey(e.target.value)} maxLength={1} className="input-field text-center" />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Billing Questions" className="input-field" />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Routes To</label>
              <input value={routesTo} onChange={(e) => setRoutesTo(e.target.value)} placeholder="e.g. Queue A" className="input-field" />
            </div>
            <button onClick={add} className="btn-purple">
              <Plus size={15} /> Add
            </button>
          </div>
        </div>

        <div className="card divide-y divide-[var(--color-border)] p-0">
          {ivrRules.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-sm font-semibold text-[var(--color-accent)]">
                {r.key}
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">{r.label}</span>
              <span className="text-sm text-[var(--color-text-tertiary)]">→ {r.routesTo}</span>
              <button onClick={() => removeIvrRule(r.id)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]" aria-label="Delete IVR option">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
