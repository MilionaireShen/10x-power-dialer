import ScreenHeader from "../components/ScreenHeader";
import { PERMISSION_SECTIONS } from "../data/mockData";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function UsersPermissions() {
  const { managerPermissionTemplate, updateManagerPermissionTemplate } = useAppData();
  const { notify } = useToast();

  const toggle = (key) => {
    updateManagerPermissionTemplate({ [key]: !managerPermissionTemplate[key] });
  };

  return (
    <div>
      <ScreenHeader
        category="Users"
        title="Role Permissions"
        actions={
          <button onClick={() => notify("Default Manager permission template saved.", "success")} className="btn-purple">
            Save Template
          </button>
        }
      />
      <div className="p-8 space-y-6">
        <div className="card">
          <p className="text-sm text-[var(--color-text-secondary)]">
            This is the default permission template applied to newly created <span className="font-medium text-[var(--color-text-primary)]">Manager</span> accounts.
            Individual managers can still be adjusted from their own user record in <span className="font-medium text-[var(--color-text-primary)]">All Users</span>.
          </p>
        </div>

        {PERMISSION_SECTIONS.map((section) => (
          <div key={section.key} className="card">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{section.label}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.permissions.map((p) => (
                <label key={p.key} className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]">
                  <input type="checkbox" checked={Boolean(managerPermissionTemplate[p.key])} onChange={() => toggle(p.key)} className="accent-[var(--color-accent)]" />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
