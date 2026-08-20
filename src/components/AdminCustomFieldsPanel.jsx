import { useEffect, useRef, useState } from "react";
import { Lock, Plus, Trash2, GripVertical } from "lucide-react";
import SidePanel from "./SidePanel";
import { DEFAULT_LEAD_FIELDS, FIELD_TYPES } from "../data/mockData";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function AdminCustomFieldsPanel({ open, onClose }) {
  const { customFields, setCustomFields } = useAppData();
  const { notify } = useToast();
  const [draft, setDraft] = useState(customFields);
  const dragIndex = useRef(null);

  useEffect(() => {
    if (open) setDraft(customFields);
  }, [open, customFields]);

  const addField = () => {
    setDraft((prev) => [...prev, { id: `cf-${Date.now()}`, label: "", type: "Text", required: false }]);
  };

  const updateField = (id, patch) => {
    setDraft((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id) => {
    setDraft((prev) => prev.filter((f) => f.id !== id));
  };

  const reorder = (from, to) => {
    setDraft((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const save = () => {
    const missingLabels = draft.some((f) => !f.label.trim());
    if (missingLabels) {
      notify("Every custom field needs a label before saving.", "warning");
      return;
    }
    setCustomFields(draft);
    notify("Field configuration saved — agent call screens update instantly.", "success", { title: "Lead Fields Updated" });
    onClose();
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Lead Information Fields"
      subtitle="Customize what agents see when a call connects"
      widthClass="max-w-lg"
    >
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Default Fields</h3>
          <div className="space-y-1.5">
            {DEFAULT_LEAD_FIELDS.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                <span className="text-sm text-[var(--color-text-primary)]">{f.label}</span>
                <Lock size={14} className="text-[var(--color-text-tertiary)]" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Custom Fields</h3>
          </div>

          <div className="space-y-2">
            {draft.map((f, i) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex.current === null || dragIndex.current === i) return;
                  reorder(dragIndex.current, i);
                  dragIndex.current = null;
                }}
                className="rounded-lg border border-[var(--color-border)] bg-white p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-2.5 cursor-grab text-[var(--color-text-tertiary)]" title="Drag to reorder">
                    <GripVertical size={16} />
                  </span>
                  <div className="flex-1 space-y-2">
                    <input
                      value={f.label}
                      onChange={(e) => updateField(f.id, { label: e.target.value })}
                      placeholder="e.g. Roof Age, Home Owner, Insurance Provider"
                      className="input-field"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={f.type}
                        onChange={(e) => updateField(f.id, { type: e.target.value })}
                        className="input-field w-auto"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <button
                          type="button"
                          onClick={() => updateField(f.id, { required: !f.required })}
                          className={`h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${f.required ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                        >
                          <span className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform duration-200 ${f.required ? "translate-x-4" : ""}`} />
                        </button>
                        Required
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={() => removeField(f.id)}
                    className="mt-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition-colors"
                    aria-label="Delete field"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addField} className="btn-gray mt-3 w-full">
            <Plus size={15} /> Add Custom Field
          </button>
        </div>

        <button onClick={save} className="btn-purple w-full py-3">
          Save Field Configuration
        </button>
      </div>
    </SidePanel>
  );
}
