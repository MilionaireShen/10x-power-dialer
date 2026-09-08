import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import SidePanel from "./SidePanel";
import { CALENDAR_PROVIDERS, isValidCalendarUrl } from "../data/catalogues";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

const emptyForm = {
  name: "",
  calendar_provider: CALENDAR_PROVIDERS[0],
  calendar_url: "",
  calendar_enabled: false,
  campaign_ids: [],
};

export default function ClientPanel({ open, onClose, editingClient, campaigns = [], onSaved }) {
  const { notify } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [testState, setTestState] = useState(null); // null | "checking" | { ok, message }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTestState(null);
    setForm(
      editingClient
        ? {
            name: editingClient.name || "",
            calendar_provider: editingClient.calendar_provider || CALENDAR_PROVIDERS[0],
            calendar_url: editingClient.calendar_url || "",
            calendar_enabled: !!editingClient.calendar_url,
            // The link lives on the campaign, so the current selection is read
            // back from the campaigns pointing at this client.
            campaign_ids: campaigns.filter((c) => c.client_id === editingClient.id).map((c) => c.id),
          }
        : emptyForm
    );
  }, [open, editingClient, campaigns]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleCampaign = (id) => {
    setForm((f) => ({
      ...f,
      campaign_ids: f.campaign_ids.includes(id) ? f.campaign_ids.filter((c) => c !== id) : [...f.campaign_ids, id],
    }));
  };

  // Asks the server to fetch the URL. It reports whether the page responded
  // and nothing more — availability is not parsed from it, so this no longer
  // claims to have found open slots.
  const testConnection = async () => {
    setTestState("checking");
    try {
      const res = await adminService.testCalendarUrl(form.calendar_url);
      setTestState({ ok: !!res?.data?.reachable, message: res?.message });
    } catch (err) {
      setTestState({ ok: false, message: err?.response?.data?.message || "Could not check that URL." });
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      notify("Give this client a name before saving.", "warning");
      return;
    }
    if (form.calendar_enabled && !isValidCalendarUrl(form.calendar_url)) {
      notify("Calendar is enabled but the URL isn't valid — fix the URL or disable the calendar.", "warning");
      return;
    }

    const payload = {
      name: form.name.trim(),
      calendar_provider: form.calendar_provider,
      // Clearing the URL is how a calendar is disabled; the list reads the
      // presence of a URL as "enabled", so the two cannot disagree.
      calendar_url: form.calendar_enabled ? form.calendar_url : "",
      campaign_ids: form.campaign_ids,
    };

    setSaving(true);
    try {
      if (editingClient) {
        await adminService.updateClient(editingClient.id, payload);
        notify(`${payload.name}'s calendar configuration saved.`, "success");
      } else {
        await adminService.createClient(payload);
        notify(`${payload.name} added.`, "success", { title: "Client Created" });
      }
      await onSaved?.();
      onClose();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save this client.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={editingClient ? `Edit ${editingClient.name}` : "Add New Client"}
      subtitle="Configure their calendar and campaign mapping"
      widthClass="max-w-lg"
    >
      <div className="space-y-6">
        <Field label="Client Name">
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} className="input-field" placeholder="e.g. Bright Path Solar" />
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Calendar Availability</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">Off by default — agents see a &ldquo;not configured&rdquo; message until this is on</p>
          </div>
          <button
            type="button"
            onClick={() => setField("calendar_enabled", !form.calendar_enabled)}
            className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${form.calendar_enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
          >
            <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${form.calendar_enabled ? "translate-x-5" : ""}`} />
          </button>
        </div>

        <Field label="Calendar Provider">
          <select value={form.calendar_provider} onChange={(e) => setField("calendar_provider", e.target.value)} className="input-field">
            {CALENDAR_PROVIDERS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="Calendar / Availability URL">
          <div className="flex gap-2">
            <input
              value={form.calendar_url}
              onChange={(e) => {
                setField("calendar_url", e.target.value);
                setTestState(null);
              }}
              className="input-field"
              placeholder="https://calendly.com/client-name/consult"
            />
            <button type="button" onClick={testConnection} className="btn-gray shrink-0 px-3 text-sm">
              Test
            </button>
          </div>
          {testState === "checking" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
              <Loader2 size={12} className="animate-spin" /> Checking calendar…
            </p>
          )}
          {testState && testState !== "checking" && (
            <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${testState.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
              {testState.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {testState.message}
            </p>
          )}
        </Field>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">Associated Campaigns / Lead Lists</label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-border)] p-2">
            {campaigns.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-[var(--color-text-tertiary)]">No campaigns yet.</p>
            ) : (
              campaigns.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]">
                  <input type="checkbox" checked={form.campaign_ids.includes(c.id)} onChange={() => toggleCampaign(c.id)} className="accent-[var(--color-accent)]" />
                  {c.name}
                </label>
              ))
            )}
          </div>
          <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
            A campaign can only belong to one client — selecting it here removes it from any other client automatically.
          </p>
        </div>

        <button onClick={save} disabled={saving} className="btn-purple w-full py-3 disabled:opacity-40">
          {saving ? "Saving…" : "Save Calendar Configuration"}
        </button>
      </div>
    </SidePanel>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}
