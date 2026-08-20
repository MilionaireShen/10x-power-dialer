import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

const OPTIONS = [
  { key: "autoLogout", label: "Agent Auto-Logout", desc: "Notify admins when an agent is auto-logged out for inactivity" },
  { key: "campaignPaused", label: "Campaign Paused", desc: "Notify admins when a campaign is paused, manually or automatically" },
  { key: "leadListUploaded", label: "Lead List Uploaded", desc: "Notify admins when a new lead list finishes uploading and scrubbing" },
  { key: "spamFlagged", label: "Number Flagged as Spam", desc: "Notify admins when an outbound number gets flagged by a carrier" },
];

export default function SettingsEmailNotifications() {
  const { adminSettings, updateAdminSettings } = useAppData();
  const { notify } = useToast();

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Email Notifications"
        actions={
          <button onClick={() => notify("Notification preferences saved.", "success")} className="btn-purple">
            Save Changes
          </button>
        }
      />
      <div className="p-8">
        <div className="card max-w-xl divide-y divide-[var(--color-border)] p-0">
          {OPTIONS.map((o) => (
            <div key={o.key} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{o.label}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{o.desc}</p>
              </div>
              <button
                onClick={() => updateAdminSettings("emailNotifications", { [o.key]: !adminSettings.emailNotifications[o.key] })}
                className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${adminSettings.emailNotifications[o.key] ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
              >
                <span
                  className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${adminSettings.emailNotifications[o.key] ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
