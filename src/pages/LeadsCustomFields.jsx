import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";
import campaignService from "../services/campaignService";

// The lead columns an admin can surface without creating a new custom
// field — these map straight onto existing lead data. Keep field_name in
// sync with LEAD_KEYS in components/CustomerInfoFields.jsx.
const MAPPABLE_LEAD_FIELDS = [
  { field_name: "full_name", label: "Full Name" },
  { field_name: "first_name", label: "First Name" },
  { field_name: "last_name", label: "Last Name" },
  { field_name: "phone_number", label: "Phone Number" },
  { field_name: "email", label: "Email Address" },
  { field_name: "street_address", label: "Street Address" },
  { field_name: "city", label: "City" },
  { field_name: "state", label: "State" },
  { field_name: "zip_code", label: "Zip Code" },
  { field_name: "age", label: "Age" },
  { field_name: "timezone", label: "Timezone" },
  { field_name: "notes", label: "Notes" },
  { field_name: "last_travel_date", label: "Last Travel Date" },
  { field_name: "last_travel_destination", label: "Last Travel Destination" },
];

const FIELD_TYPES = ["text", "number", "date"];
const COMPANY_SCOPE = "";

export default function LeadsCustomFields() {
  const { notify } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [scope, setScope] = useState(COMPANY_SCOPE); // "" = company default, else a campaign id
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const [newLabel, setNewLabel] = useState("");
  const [newMapping, setNewMapping] = useState("__custom__");
  const [newType, setNewType] = useState("text");

  useEffect(() => {
    campaignService.list().then((r) => setCampaigns(r?.data || [])).catch(() => setCampaigns([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listCustomFields(scope || undefined);
      setFields((res?.data?.fields || []).slice().sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)));
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load the field layout.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [scope, notify]);

  useEffect(() => { load(); }, [load]);

  const usingCompanyDefault = scope !== COMPANY_SCOPE && fields.length === 0 && !loading && !error;
  const takenNames = useMemo(() => new Set(fields.map((f) => f.field_name)), [fields]);
  const availableMappings = MAPPABLE_LEAD_FIELDS.filter((m) => !takenNames.has(m.field_name));

  const patch = async (field, body) => {
    setBusy(field.id);
    try {
      await adminService.updateCustomField(field.id, body);
      await load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save the field.", "error");
    } finally {
      setBusy(null);
    }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const a = fields[index];
    const b = fields[target];
    setBusy(a.id);
    try {
      await Promise.all([
        adminService.updateCustomField(a.id, { display_order: b.display_order ?? target + 1 }),
        adminService.updateCustomField(b.id, { display_order: a.display_order ?? index + 1 }),
      ]);
      await load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not reorder.", "error");
    } finally {
      setBusy(null);
    }
  };

  const addField = async () => {
    const mapped = MAPPABLE_LEAD_FIELDS.find((m) => m.field_name === newMapping);
    const label = newLabel.trim() || mapped?.label;
    if (!label) { notify("Give the field a label first.", "warning"); return; }
    setBusy("new");
    try {
      await adminService.createCustomField({
        field_label: label,
        field_name: mapped ? mapped.field_name : undefined, // custom -> server derives from label
        field_type: newType,
        display_order: (fields[fields.length - 1]?.display_order ?? fields.length) + 1,
        campaign_id: scope || null,
        is_active: true,
      });
      setNewLabel("");
      setNewMapping("__custom__");
      notify("Field added — agent screens pick it up on their next lead.", "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not add the field.", "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (field) => {
    if (!window.confirm(`Remove "${field.field_label}" from this layout?`)) return;
    setBusy(field.id);
    try {
      await adminService.deleteCustomField(field.id);
      notify(`"${field.field_label}" removed.`, "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not remove the field.", "error");
    } finally {
      setBusy(null);
    }
  };

  const createCampaignLayout = async () => {
    setBusy("clone");
    try {
      await adminService.cloneFieldsToCampaign(scope);
      notify("Custom layout created from the company default — edit it freely below.", "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not create the layout.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <ScreenHeader category="Leads" title="Customer Information Fields" />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">Applies to</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="input-field py-1.5 text-sm">
              <option value={COMPANY_SCOPE}>Company default — all campaigns</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Agents see these fields, in this order, on the Customer Information section when a lead loads.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : error ? (
          <EmptyState icon={Plus} title="Could not load fields" description={error} />
        ) : usingCompanyDefault ? (
          <div className="card flex flex-col items-start gap-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              This campaign uses the <span className="font-medium text-[var(--color-text-primary)]">company default</span> layout.
              Create a custom layout to give this campaign its own fields, labels and order.
            </p>
            <button onClick={createCampaignLayout} disabled={busy === "clone"} className="btn-purple disabled:opacity-40">
              <Plus size={15} /> Create a custom layout for this campaign
            </button>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="space-y-2">
                {fields.map((f, i) => {
                  const inactive = f.is_active === false;
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${inactive ? "border-dashed border-[var(--color-border)] bg-[var(--color-bg)] opacity-60" : "border-[var(--color-border)] bg-white"}`}
                    >
                      <div className="flex flex-col">
                        <button onClick={() => move(i, -1)} disabled={i === 0 || busy === f.id} className="text-[var(--color-text-tertiary)] disabled:opacity-30 hover:text-[var(--color-text-primary)]">
                          <ArrowUp size={13} />
                        </button>
                        <button onClick={() => move(i, 1)} disabled={i === fields.length - 1 || busy === f.id} className="text-[var(--color-text-tertiary)] disabled:opacity-30 hover:text-[var(--color-text-primary)]">
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      <input
                        defaultValue={f.field_label}
                        key={`${f.id}-${f.field_label}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== f.field_label) patch(f, { field_label: v });
                        }}
                        className="input-field flex-1 py-1.5 text-sm"
                      />

                      <span className="hidden w-40 shrink-0 truncate font-mono text-[11px] text-[var(--color-text-tertiary)] sm:block" title="Lead data field (fixed)">
                        {f.field_name}
                      </span>

                      <button
                        type="button"
                        onClick={() => patch(f, { is_active: inactive })}
                        disabled={busy === f.id}
                        title={inactive ? "Hidden from agents — click to show" : "Shown to agents — click to hide"}
                        className={`shrink-0 rounded p-1.5 ${inactive ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-success)]"} hover:bg-[var(--color-bg)]`}
                      >
                        {inactive ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>

                      {f.is_default_field && !f.campaign_id ? (
                        <Lock size={14} className="shrink-0 text-[var(--color-text-tertiary)]" title="Built-in — hide it instead of deleting" />
                      ) : (
                        <button
                          onClick={() => remove(f)}
                          disabled={busy === f.id}
                          className="shrink-0 rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-tint)] hover:text-[var(--color-danger)] disabled:opacity-40"
                          aria-label="Delete field"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {fields.length === 0 && (
                  <p className="text-sm text-[var(--color-text-tertiary)]">No fields in this layout yet — add one below.</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Add a field</h3>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">Lead data</span>
                  <select value={newMapping} onChange={(e) => setNewMapping(e.target.value)} className="input-field py-1.5 text-sm">
                    <option value="__custom__">Custom field…</option>
                    {availableMappings.map((m) => <option key={m.field_name} value={m.field_name}>{m.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">Display label</span>
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addField(); }}
                    placeholder={MAPPABLE_LEAD_FIELDS.find((m) => m.field_name === newMapping)?.label || "e.g. Travel Budget"}
                    className="input-field py-1.5 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">Type</span>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="input-field py-1.5 text-sm">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <button onClick={addField} disabled={busy === "new"} className="btn-purple shrink-0 py-1.5 disabled:opacity-40">
                  <Plus size={15} /> Add
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
                Renaming a label never changes the underlying lead data. A custom field is stored per-lead and can be filled during import.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
