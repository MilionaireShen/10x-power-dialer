import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function PhoneSystemAssignment() {
  const { phoneNumbers, campaigns, updatePhoneNumber } = useAppData();
  const { notify } = useToast();

  return (
    <div>
      <ScreenHeader category="Phone System" title="Number Assignment" />
      <div className="p-8">
        <div className="card divide-y divide-[var(--color-border)] p-0">
          {phoneNumbers.map((n) => (
            <div key={n.id} className="flex items-center gap-4 px-5 py-4">
              <span className="w-40 shrink-0 font-medium text-[var(--color-text-primary)]">{n.number}</span>
              <span className="flex-1 text-sm text-[var(--color-text-tertiary)]">
                {n.campaignId ? campaigns.find((c) => c.id === n.campaignId)?.name : "Currently unassigned"}
              </span>
              <select
                value={n.campaignId ?? ""}
                onChange={(e) => {
                  updatePhoneNumber(n.id, { campaignId: e.target.value || null });
                  notify(`${n.number} reassigned.`, "success");
                }}
                className="input-field w-64"
              >
                <option value="">Unassigned</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
