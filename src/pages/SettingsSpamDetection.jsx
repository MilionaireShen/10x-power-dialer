import ScreenHeader from "../components/ScreenHeader";
import { PHONE_NUMBERS } from "../data/mockData";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function SettingsSpamDetection() {
  const { adminSettings, updateAdminSettings } = useAppData();
  const { notify } = useToast();
  const { enabled, alertThreshold } = adminSettings.spamDetection;
  const flagged = PHONE_NUMBERS.filter((n) => n.spamFlag);

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Spam Detection Settings"
        actions={
          <button onClick={() => notify("Spam detection settings saved.", "success")} className="btn-purple">
            Save Changes
          </button>
        }
      />
      <div className="p-8 space-y-6">
        <div className="card max-w-xl space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Spam Detection Monitoring</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Flags numbers carriers are marking as "Spam Likely"</p>
            </div>
            <button
              onClick={() => updateAdminSettings("spamDetection", { enabled: !enabled })}
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
                value={alertThreshold}
                onChange={(e) => updateAdminSettings("spamDetection", { alertThreshold: Number(e.target.value) })}
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
            <p className="text-sm text-[var(--color-text-tertiary)]">No numbers currently flagged as spam.</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {flagged.map((n) => (
                <div key={n.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{n.number}</span>
                  <span className="pill bg-[var(--color-danger-tint)] text-[var(--color-danger)]">Spam Likely</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
