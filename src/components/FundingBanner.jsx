import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, PauseCircle, HelpCircle } from "lucide-react";
import adminService from "../services/adminService";

// Sits above every admin screen and says, when it is true, that the telephony
// account cannot pay for calls.
//
// Nothing here is decided in the browser: the backend compares the real
// provider balance against the configured thresholds and reports a state. The
// banner only renders what it was told, so it cannot warn about a problem that
// does not exist or stay quiet about one that does.

const POLL_MS = 60 * 1000;

export default function FundingBanner() {
  const navigate = useNavigate();
  const [funding, setFunding] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await adminService.fundingStatus();
      setFunding(res?.data || null);
    } catch {
      // A manager or agent without permission gets a 403 here, which is not a
      // problem to shout about — the banner simply does not apply to them.
      setFunding(null);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  if (!funding) return null;

  // An unreadable balance is its own state. Silently showing nothing would
  // imply everything is fine when we simply could not check.
  if (funding.balance_error) {
    return (
      <Banner
        tone="warning"
        Icon={HelpCircle}
        title="Balance unavailable"
        body={`The telephony account balance could not be read: ${funding.balance_error}`}
        actionLabel="Open Integrations"
        onAction={() => navigate("/admin/settings/integrations")}
      />
    );
  }

  if (funding.out_of_funds) {
    const paused = funding.paused_campaigns?.length ?? 0;
    return (
      <Banner
        tone="danger"
        Icon={PauseCircle}
        title={paused ? "CAMPAIGNS PAUSED" : "OUT OF FUNDS"}
        body={
          paused
            ? `Your telephony account is out of funds. ${paused} campaign${paused === 1 ? " has" : "s have"} been temporarily paused. Add funds to resume calling and messaging — no campaign data has been changed.`
            : "Your telephony account is out of funds. Calls and messages will be refused until it is topped up."
        }
        actionLabel="Manage funding"
        onAction={() => navigate("/admin/settings/integrations")}
      />
    );
  }

  if (funding.low_balance) {
    return (
      <Banner
        tone="warning"
        Icon={AlertTriangle}
        title="LOW FUNDS"
        body={`Your telephony account balance is running low (${formatMoney(funding.balance)}). Please add funds to prevent campaigns from being interrupted.`}
        actionLabel="Manage funding"
        onAction={() => navigate("/admin/settings/integrations")}
      />
    );
  }

  return null;
}

function formatMoney(balance) {
  if (!balance) return "unknown";
  const amount = Number(balance.available ?? balance.amount);
  return `${amount < 0 ? "-" : ""}$${Math.abs(amount).toFixed(2)} ${balance.currency || ""}`.trim();
}

function Banner({ tone, Icon, title, body, actionLabel, onAction }) {
  const colors = tone === "danger"
    ? { bg: "var(--color-danger-tint)", border: "var(--color-danger)", text: "var(--color-danger)" }
    : { bg: "var(--color-warning-tint)", border: "var(--color-warning)", text: "var(--color-warning)" };

  return (
    <div
      className="flex items-start gap-3 border-b px-6 py-3"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <Icon size={18} className="mt-0.5 shrink-0" style={{ color: colors.text }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: colors.text }}>{title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{body}</p>
      </div>
      <button
        onClick={onAction}
        className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/50"
        style={{ borderColor: colors.border, color: colors.text }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
