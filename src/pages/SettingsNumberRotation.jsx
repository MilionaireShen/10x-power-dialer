import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// Read by the DID selector when it chooses an outbound caller ID: a number
// that has already made its quota of calls today drops behind numbers that
// have not, so volume spreads instead of one number carrying a campaign and
// burning its own reputation.
//
// Previously this screen only updated React state, so rotation ran on the
// selector's built-in ordering no matter what was set here.
const SETTING_KEY = "number_rotation";
const DEFAULTS = { enabled: false, rotate_every_calls: 50 };

export default function SettingsNumberRotation() {
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
      notify("Number rotation settings saved.", "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save these settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const { enabled, rotate_every_calls: rotateEveryCalls } = settings;

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Number Rotation Settings"
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
          <div className="card max-w-xl space-y-5">
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Automatic Number Rotation</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Rotates outbound caller ID to protect number reputation</p>
              </div>
              <button
                onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
                className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
              >
                <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${enabled ? "translate-x-5" : ""}`} />
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Rotate Every</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  value={rotateEveryCalls}
                  onChange={(e) => setSettings((s) => ({ ...s, rotate_every_calls: Number(e.target.value) }))}
                  className="input-field w-32"
                  disabled={!enabled}
                />
                <span className="text-sm text-[var(--color-text-secondary)]">calls per number</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
