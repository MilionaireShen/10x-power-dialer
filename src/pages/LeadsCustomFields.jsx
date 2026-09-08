import { useCallback, useEffect, useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { FIELD_TYPES } from "../data/catalogues";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

export default function LeadsCustomFields() {
  const { notify } = useToast();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState(FIELD_TYPES[0]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminService.listCustomFields();
      setFields(res?.data?.fields || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load lead fields.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  // Saved individually rather than as one batch: a field is a row, and editing
  // one should not risk rewriting the others.
  const add = async () => {
    if (!newLabel.trim()) {
      notify("Give the field a label first.", "warning");
      return;
    }
    setBusy("new");
    try {
      await adminService.createCustomField({
        field_label: newLabel.trim(),
        field_type: newType,
        display_order: fields.length + 1,
      });
      setNewLabel("");
      notify("Field added — agent call screens pick it up on their next load.", "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not add the field.", "error");
    } finally {
      setBusy(null);
    }
  };

  const update = async (field, patch) => {
    setBusy(field.id);
    try {
      await adminService.updateCustomField(field.id, patch);
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save the field.", "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (field) => {
    setBusy(field.id);
    try {
      await adminService.deleteCustomField(field.id);
      notify(`"${field.field_label}" removed.`, "success");
      load();
    } catch (err) {
      // Built-in fields are refused by the server, with a reason.
      notify(err?.response?.data?.message || "Could not remove the field.", "error");
    } finally {
      setBusy(null);
    }
  };

  const defaults = fields.filter((f) => f.is_default_field);
  const custom = fields.filter((f) => !f.is_default_field);

  return (
    <div>
      <ScreenHeader category="Leads" title="Custom Fields" />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Default Fields</h3>
          {loading ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : defaults.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">No default fields configured.</p>
          ) : (
            <div className="space-y-1.5">
              {defaults.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                  <span className="text-sm text-[var(--color-text-primary)]">{f.field_label}</span>
                  <Lock size={14} className="text-[var(--color-text-tertiary)]" title="Built in — cannot be removed" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Custom Fields</h3>

          {loading ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : error ? (
            <EmptyState icon={Plus} title="Could not load fields" description={error} />
          ) : custom.length === 0 ? (
            <p className="mb-3 text-sm text-[var(--color-text-tertiary)]">
              No custom fields yet. Add one below and it appears on every agent's lead card.
            </p>
          ) : (
            <div className="space-y-2">
              {custom.map((f) => (
                <div key={f.id} className="rounded-lg border border-[var(--color-border)] bg-white p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        defaultValue={f.field_label}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== f.field_label) update(f, { field_label: v });
                        }}
                        placeholder="e.g. Roof Age, Home Owner, Insurance Provider"
                        className="input-field"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={f.field_type}
                          onChange={(e) => update(f, { field_type: e.target.value })}
                          className="input-field w-auto"
                        >
                          {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                          <button
                            type="button"
                            onClick={() => update(f, { is_required: !f.is_required })}
                            className={`h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${f.is_required ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                          >
                            <span className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform duration-200 ${f.is_required ? "translate-x-4" : ""}`} />
                          </button>
                          Required
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => remove(f)}
                      disabled={busy === f.id}
                      className="mt-1 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-danger)] disabled:opacity-40"
                      aria-label="Delete field"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="New field label"
              className="input-field flex-1"
            />
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className="input-field w-auto">
              {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button onClick={add} disabled={busy === "new" || !newLabel.trim()} className="btn-purple shrink-0 disabled:opacity-40">
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
