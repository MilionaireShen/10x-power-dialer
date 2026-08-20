import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function SettingsNumberRotation() {
  const { adminSettings, updateAdminSettings } = useAppData();
  const { notify } = useToast();
  const { enabled, rotateEveryCalls } = adminSettings.numberRotation;

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Number Rotation Settings"
        actions={
          <button onClick={() => notify("Number rotation settings saved.", "success")} className="btn-purple">
            Save Changes
          </button>
        }
      />
      <div className="p-8">
        <div className="card max-w-xl space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Automatic Number Rotation</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Rotates outbound caller ID to protect number reputation</p>
            </div>
            <button
              onClick={() => updateAdminSettings("numberRotation", { enabled: !enabled })}
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
                onChange={(e) => updateAdminSettings("numberRotation", { rotateEveryCalls: Number(e.target.value) })}
                className="input-field w-32"
                disabled={!enabled}
              />
              <span className="text-sm text-[var(--color-text-secondary)]">calls per number</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
