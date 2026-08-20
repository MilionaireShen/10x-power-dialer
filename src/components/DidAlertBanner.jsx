import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, PhoneOff, X } from "lucide-react";
import { useAppData } from "../lib/AppDataContext";
import { getEligibleDIDs } from "../lib/didReputationEngine";

const ALERT_STYLE = {
  critical: { bg: "var(--color-warning-tint)", border: "var(--color-warning)", text: "var(--color-warning)", icon: AlertTriangle },
  cooling: { bg: "var(--color-warning-tint)", border: "var(--color-warning)", text: "var(--color-warning)", icon: AlertTriangle },
  auto_paused: { bg: "var(--color-danger-tint)", border: "var(--color-danger)", text: "var(--color-danger)", icon: PhoneOff },
  manual_pause: { bg: "var(--color-danger-tint)", border: "var(--color-danger)", text: "var(--color-danger)", icon: PhoneOff },
};

const ALERT_ACTION = {
  critical: "Recommended: reduce volume through this DID or review recent complaints/DNC activity.",
  cooling: "Recommended: let the cooling period finish, or manually resume once the underlying issue is fixed.",
  auto_paused: "Recommended: review the health report and manually resume once the score recovers.",
  manual_pause: "This number was paused manually and needs a manual resume.",
};

// Real-time DID Reputation alerts, shown at the top of every admin screen —
// orange for degrading numbers, red for numbers that stopped dialing, plus a
// hard-stop banner if a whole campaign has run out of usable DIDs.
export default function DidAlertBanner() {
  const { didAlerts, dismissDidAlert, phoneNumbers, campaigns, resolveDidSettingsForCampaign } = useAppData();
  const navigate = useNavigate();

  const activeAlerts = didAlerts.filter((a) => !a.dismissed).slice(0, 3);
  const extraCount = didAlerts.filter((a) => !a.dismissed).length - activeAlerts.length;

  const blockedCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => phoneNumbers.some((d) => d.campaignId === c.id))
      .filter((c) => getEligibleDIDs(phoneNumbers, c.id, null, resolveDidSettingsForCampaign(c.id)).length === 0);
  }, [campaigns, phoneNumbers, resolveDidSettingsForCampaign]);

  if (activeAlerts.length === 0 && blockedCampaigns.length === 0) return null;

  return (
    <div className="space-y-2 px-6 pt-4">
      {blockedCampaigns.map((c) => (
        <div key={c.id} className="flex items-start gap-3 rounded-lg border-2 px-4 py-3" style={{ borderColor: "var(--color-danger)", backgroundColor: "var(--color-danger-tint)" }}>
          <PhoneOff size={18} className="mt-0.5 shrink-0" style={{ color: "var(--color-danger)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--color-danger)" }}>
              {c.name} has no available DIDs — this campaign cannot dial right now.
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Every DID assigned to this campaign is cooling or paused. Resume a number manually, reassign a healthy DID, or wait for cooling to finish.
            </p>
          </div>
          <button onClick={() => navigate("/admin/phone-system/did-management")} className="btn-danger shrink-0 py-1.5 px-3 text-xs">
            Resolve Now
          </button>
        </div>
      ))}

      {activeAlerts.map((alert) => {
        const style = ALERT_STYLE[alert.type] ?? ALERT_STYLE.critical;
        const Icon = style.icon;
        const campaignName = campaigns.find((c) => c.id === alert.campaignId)?.name;
        const stillAvailable = alert.campaignId
          ? getEligibleDIDs(phoneNumbers, alert.campaignId, null, resolveDidSettingsForCampaign(alert.campaignId)).length
          : null;
        return (
          <div key={alert.id} className="flex items-start gap-3 rounded-lg border px-4 py-3" style={{ borderColor: style.border, backgroundColor: style.bg }}>
            <Icon size={18} className="mt-0.5 shrink-0" style={{ color: style.text }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: style.text }}>
                {alert.didNumber} — score {alert.score}
                {campaignName ? ` · ${campaignName}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{alert.reason}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                {ALERT_ACTION[alert.type]}
                {stillAvailable !== null && ` ${stillAvailable} DID${stillAvailable === 1 ? "" : "s"} still available for this campaign.`}
              </p>
            </div>
            <button onClick={() => navigate(`/admin/phone-system/did/${alert.didId}`)} className="btn-gray shrink-0 py-1.5 px-3 text-xs">
              View DID
            </button>
            <button onClick={() => dismissDidAlert(alert.id)} className="shrink-0 rounded-full p-1.5 text-[var(--color-text-tertiary)] hover:bg-white/60" aria-label="Dismiss alert">
              <X size={14} />
            </button>
          </div>
        );
      })}

      {extraCount > 0 && (
        <button onClick={() => navigate("/admin/phone-system/did-management")} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
          +{extraCount} more DID alert{extraCount === 1 ? "" : "s"} — view in DID Management
        </button>
      )}
    </div>
  );
}
