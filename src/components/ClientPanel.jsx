import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import SidePanel from "./SidePanel";
import { CALENDAR_PROVIDERS, isValidCalendarUrl } from "../data/mockData";
import { getClientAvailability } from "../lib/calendarAvailability";
import { useAppData } from "../lib/AppDataContext";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../lib/ToastContext";

const emptyForm = {
  name: "",
  calendarProvider: CALENDAR_PROVIDERS[0],
  calendarUrl: "",
  calendarEnabled: false,
  campaignIds: [],
};

export default function ClientPanel({ open, onClose, editingClient }) {
  const { user } = useAuth();
  const { campaigns, addClient, updateClient } = useAppData();
  const { notify } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [testState, setTestState] = useState(null); // null | "checking" | "ok" | "fail"

  useEffect(() => {
    if (!open) return;
    setTestState(null);
    setForm(
      editingClient
        ? {
            name: editingClient.name,
            calendarProvider: editingClient.calendarProvider || CALENDAR_PROVIDERS[0],
            calendarUrl: editingClient.calendarUrl || "",
            calendarEnabled: editingClient.calendarEnabled,
            campaignIds: editingClient.campaignIds || [],
          }
        : emptyForm
    );
  }, [open, editingClient]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleCampaign = (id) => {
    setForm((f) => ({ ...f, campaignIds: f.campaignIds.includes(id) ? f.campaignIds.filter((c) => c !== id) : [...f.campaignIds, id] }));
  };

  const testConnection = () => {
    if (!isValidCalendarUrl(form.calendarUrl)) {
      setTestState("fail");
      return;
    }
    setTestState("checking");
    setTimeout(() => {
      const preview = getClientAvailability(editingClient?.id ?? "preview", 1);
      setTestState({ ok: true, slotCount: preview[0]?.slots.length ?? 0, day: preview[0]?.label });
    }, 700);
  };

  const save = () => {
    if (!form.name.trim()) {
      notify("Give this client a name before saving.", "warning");
      return;
    }
    if (form.calendarEnabled && !isValidCalendarUrl(form.calendarUrl)) {
      notify("Calendar is enabled but the URL isn't valid — fix the URL or disable the calendar.", "warning");
      return;
    }
    if (editingClient) {
      updateClient(user.name, editingClient.id, form);
      notify(`${form.name}'s calendar configuration saved.`, "success");
    } else {
      addClient(user.name, form);
      notify(`${form.name} added.`, "success", { title: "Client Created" });
    }
    onClose();
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
            onClick={() => setField("calendarEnabled", !form.calendarEnabled)}
            className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${form.calendarEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
          >
            <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${form.calendarEnabled ? "translate-x-5" : ""}`} />
          </button>
        </div>

        <Field label="Calendar Provider">
          <select value={form.calendarProvider} onChange={(e) => setField("calendarProvider", e.target.value)} className="input-field">
            {CALENDAR_PROVIDERS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="Calendar / Availability URL">
          <div className="flex gap-2">
            <input
              value={form.calendarUrl}
              onChange={(e) => {
                setField("calendarUrl", e.target.value);
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
          {testState === "fail" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-danger)]">
              <XCircle size={12} /> That doesn&rsquo;t look like a valid calendar URL (must be https://).
            </p>
          )}
          {testState && testState.ok && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-success)]">
              <CheckCircle2 size={12} /> Connected — found {testState.slotCount} open slots for {testState.day}.
            </p>
          )}
        </Field>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">Associated Campaigns / Lead Lists</label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-border)] p-2">
            {campaigns.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]">
                <input type="checkbox" checked={form.campaignIds.includes(c.id)} onChange={() => toggleCampaign(c.id)} className="accent-[var(--color-accent)]" />
                {c.name}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
            A campaign can only belong to one client — selecting it here removes it from any other client automatically.
          </p>
        </div>

        <button onClick={save} className="btn-purple w-full py-3">
          Save Calendar Configuration
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
