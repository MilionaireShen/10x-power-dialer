import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function SettingsDialer() {
  const { adminSettings, updateAdminSettings } = useAppData();
  const { notify } = useToast();
  const { defaultWrapUpSeconds, callingHoursStart, callingHoursEnd, timezoneIntelligence } = adminSettings.dialer;

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Dialer Settings"
        actions={
          <button onClick={() => notify("Dialer settings saved.", "success")} className="btn-purple">
            Save Changes
          </button>
        }
      />
      <div className="p-8">
        <div className="card max-w-xl space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Default Wrap-Up Time — {defaultWrapUpSeconds}s</label>
            <input
              type="range"
              min={15}
              max={120}
              step={5}
              value={defaultWrapUpSeconds}
              onChange={(e) => updateAdminSettings("dialer", { defaultWrapUpSeconds: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Default Calling Hours</label>
            <div className="flex items-center gap-3">
              <input type="time" value={callingHoursStart} onChange={(e) => updateAdminSettings("dialer", { callingHoursStart: e.target.value })} className="input-field" />
              <span className="text-[var(--color-text-tertiary)]">to</span>
              <input type="time" value={callingHoursEnd} onChange={(e) => updateAdminSettings("dialer", { callingHoursEnd: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Timezone Intelligence</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Default for new campaigns — auto-blocks calls outside calling hours in the lead's local time</p>
            </div>
            <button
              onClick={() => updateAdminSettings("dialer", { timezoneIntelligence: !timezoneIntelligence })}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${timezoneIntelligence ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
            >
              <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${timezoneIntelligence ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
