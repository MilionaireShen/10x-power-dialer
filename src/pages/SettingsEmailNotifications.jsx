import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// Each toggle governs a real email, sent to this company's admins from the
// place the event happens: the funding guard when it pauses a campaign, the
// reputation scorer when a number falls into the critical band, the lead
// importer when a list finishes, and the idle sweep when it signs an agent
// out.
//
// Previously the toggles lived in React state and no email of any kind was
// ever sent — an admin could switch all four on and hear nothing.
const SETTING_KEY = "email_notifications";

// Keys match the backend's notification events exactly; a mismatch here would
// silently disable a notification rather than fail.
const OPTIONS = [
  { key: "auto_logout", label: "Agent Auto-Logout", desc: "Notify admins when an agent is auto-logged out for inactivity" },
  { key: "campaign_paused", label: "Campaign Paused", desc: "Notify admins when a campaign is paused, manually or automatically" },
  { key: "lead_list_uploaded", label: "Lead List Uploaded", desc: "Notify admins when a new lead list finishes uploading and scrubbing" },
  { key: "spam_flagged", label: "Number Flagged as Spam", desc: "Notify admins when an outbound number gets flagged by a carrier" },
];

const DEFAULTS = OPTIONS.reduce((acc, o) => ({ ...acc, [o.key]: false }), {});

export default function SettingsEmailNotifications() {
  const { notify } = useToast();
  const [settings, setSettings] = useState(DEFAULTS);
  const [baseline, setBaseline] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getSettings()
      .then((res) => {
        if (cancelled) return;
        const merged = { ...DEFAULTS, ...(res?.data?.settings?.[SETTING_KEY] || {}) };
        setSettings(merged);
        setBaseline(merged);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = JSON.stringify(settings) !== JSON.stringify(baseline);

  const save = async () => {
    setSaving(true);
    try {
      await adminService.saveSettings({ [SETTING_KEY]: settings });
      setBaseline(settings);
      notify("Notification preferences saved.", "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save these preferences.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Email Notifications"
        actions={
          <button onClick={save} disabled={!dirty || saving} className="btn-purple disabled:opacity-40">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        }
      />
      <div className="p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : (
          <div className="card max-w-xl divide-y divide-[var(--color-border)] p-0">
            {OPTIONS.map((o) => (
              <div key={o.key} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{o.label}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{o.desc}</p>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, [o.key]: !s[o.key] }))}
                  className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${settings[o.key] ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                >
                  <span
                    className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${settings[o.key] ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
