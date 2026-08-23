import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";
import didService from "../services/didService";

const SETTING_KEY = "spam_detection";
const DEFAULTS = { enabled: true, alert_threshold: 3 };

export default function SettingsSpamDetection() {
  const { notify } = useToast();
  const [settings, setSettings] = useState(DEFAULTS);
  const [baseline, setBaseline] = useState(DEFAULTS);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminService.getSettings().catch(() => null),
      didService.list().catch(() => null),
    ]).then(([s, dids]) => {
      const stored = s?.data?.settings?.[SETTING_KEY];
      const merged = { ...DEFAULTS, ...(stored || {}) };
      setSettings(merged);
      setBaseline(merged);

      // Flagged numbers come from the DID health record the reputation engine
      // maintains, not from a list of numbers marked by hand.
      const rows = dids?.data || [];
      setFlagged(rows.filter((d) => d.health?.auto_paused || d.spam_flag || d.health?.is_cooling));
      setLoading(false);
    });
  }, []);

  const dirty = JSON.stringify(settings) !== JSON.stringify(baseline);

  const save = async () => {
    setSaving(true);
    try {
      await adminService.saveSettings({ [SETTING_KEY]: settings });
      setBaseline(settings);
      notify("Spam detection settings saved.", "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save these settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const { enabled, alert_threshold: threshold } = settings;

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Spam Detection Settings"
        actions={
          <button onClick={save} disabled={!dirty || saving} className="btn-purple disabled:opacity-40">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        }
      />
      <div className="space-y-6 p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : (
          <>
            <div className="card max-w-xl space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Spam Detection Monitoring</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Flags numbers carriers are marking as "Spam Likely"</p>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
                  className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                >
                  <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${enabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Alert Threshold</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={threshold}
                    onChange={(e) => setSettings((s) => ({ ...s, alert_threshold: Number(e.target.value) }))}
                    className="input-field w-32"
                    disabled={!enabled}
                  />
                  <span className="text-sm text-[var(--color-text-secondary)]">spam reports before flagging a number</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Currently Flagged Numbers</h2>
              {flagged.length === 0 ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="No numbers currently flagged"
                  description="Numbers appear here when the reputation engine pauses or rests them."
                />
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {flagged.map((n) => (
                    <div key={n.id} className="flex items-center justify-between py-2.5">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{n.phone_number}</span>
                      <span className="pill bg-[var(--color-danger-tint)] text-[var(--color-danger)]">
                        {n.health?.auto_paused_reason || n.health?.cooling_reason || "Flagged"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
