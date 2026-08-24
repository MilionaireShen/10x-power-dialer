import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// Company name and timezone are read from and written to the company record.
// This screen previously updated React state and toasted "saved", so the
// values were gone on the next refresh and never reached the dialer, which
// reads the company timezone to decide when it may call.
const TIMEZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York"];

export default function SettingsGeneral() {
  const { notify } = useToast();
  const [form, setForm] = useState({ name: "", timezone: TIMEZONES[3] });
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getCompany()
      .then((res) => {
        if (cancelled) return;
        const c = res?.data?.company;
        const next = { name: c?.name || "", timezone: c?.timezone || TIMEZONES[3] };
        setForm(next);
        setBaseline(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || "Could not load these settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = baseline && JSON.stringify(form) !== JSON.stringify(baseline);

  const save = async () => {
    setSaving(true);
    try {
      await adminService.saveCompany(form);
      setBaseline(form);
      notify("General settings saved.", "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save these settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="General Settings"
        actions={
          <button onClick={save} disabled={!dirty || saving} className="btn-purple disabled:opacity-40">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        }
      />
      <div className="p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        ) : (
          <div className="card max-w-xl space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Company Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Default Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="input-field"
              >
                {/* A timezone already saved that is not one of the four presets
                    is kept in the list, so opening this screen cannot silently
                    change it to something else on the next save. */}
                {(TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]).map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
