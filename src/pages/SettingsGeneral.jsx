import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

const TIMEZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York"];

export default function SettingsGeneral() {
  const { adminSettings, updateAdminSettings } = useAppData();
  const { notify } = useToast();
  const { companyName, timezone } = adminSettings.general;

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="General Settings"
        actions={
          <button onClick={() => notify("General settings saved.", "success")} className="btn-purple">
            Save Changes
          </button>
        }
      />
      <div className="p-8">
        <div className="card max-w-xl space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Company Name</label>
            <input
              value={companyName}
              onChange={(e) => updateAdminSettings("general", { companyName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Default Timezone</label>
            <select value={timezone} onChange={(e) => updateAdminSettings("general", { timezone: e.target.value })} className="input-field">
              {TIMEZONES.map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
