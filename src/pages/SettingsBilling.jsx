import { useEffect, useState } from "react";
import { Download, Wallet, ExternalLink } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import { useToast } from "../lib/ToastContext";
import billingService from "../services/billingService";

const TELNYX_BILLING_URL = "https://portal.telnyx.com/#/app/billing";
const TOP_UP_AMOUNTS = [25, 50, 100, 250];

export default function SettingsBilling() {
  const { notify } = useToast();
  const [balance, setBalance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const loadBalance = () => billingService.getBalance().then((res) => setBalance(res.data)).catch(() => {});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      billingService.getBalance(),
      billingService.getSummary(),
      billingService.getTransactions({ page: 1, limit: 25 }),
      billingService.getUsage({}),
    ])
      .then(([balanceRes, summaryRes, txRes, usageRes]) => {
        if (cancelled) return;
        setBalance(balanceRes.data);
        setSummary(summaryRes.data);
        setTransactions(txRes.data || []);
        setUsage(usageRes.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Telnyx is the source of truth for the balance — after a top-up the
  // admin completes payment on Telnyx's own site, so refetch when they
  // tab back here instead of expecting a webhook round-trip to have
  // already landed.
  useEffect(() => {
    const onFocus = () => loadBalance();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await billingService.downloadTransactionsCsv({ limit: 500 });
    } catch {
      notify("Could not export transactions.", "error");
    } finally {
      setExporting(false);
    }
  };

  const usageStats = [
    { label: "Calls", value: usage?.calls_count ?? usage?.total_calls ?? 0 },
    { label: "Minutes Used", value: usage?.total_minutes ?? usage?.minutes_used ?? 0 },
    { label: "SMS Sent", value: usage?.sms_count ?? usage?.total_sms ?? 0 },
    { label: "Active DIDs", value: usage?.active_dids ?? usage?.did_count ?? 0 },
  ];

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Billing"
        actions={
          <button onClick={() => setTopUpOpen(true)} className="btn-purple">
            <Wallet size={15} /> Top Up Credits
          </button>
        }
      />
      <div className="p-8 space-y-6">
        {loaded && !balance ? (
          <div className="card text-sm text-[var(--color-text-tertiary)]">Could not load billing data right now.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card">
                <p className={`text-2xl font-semibold ${balance?.warning ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}>
                  {loaded ? `$${(balance?.balance ?? 0).toFixed(2)}` : "—"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Telnyx Balance {balance?.currency ? `(${balance.currency})` : ""}</p>
                {balance?.warning && <p className="mt-1 text-xs font-medium text-[var(--color-danger)]">Below ${balance.threshold} threshold</p>}
              </div>
              <div className="card">
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{loaded ? `$${(summary?.today_spend ?? 0).toFixed(2)}` : "—"}</p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Spend Today</p>
              </div>
              <div className="card">
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{loaded ? `$${(summary?.week_spend ?? 0).toFixed(2)}` : "—"}</p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Spend Last 7 Days</p>
              </div>
              <div className="card">
                <p className="text-2xl font-semibold text-[var(--color-accent)]">{loaded ? `$${(summary?.projected_month_spend ?? 0).toFixed(2)}` : "—"}</p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Projected This Month</p>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Usage This Month</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {usageStats.map((s) => (
                  <div key={s.label} className="rounded-lg bg-[var(--color-bg)] px-3 py-3 text-center">
                    <p className="text-xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card overflow-x-auto p-0">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Recent Transactions</h3>
                <button onClick={handleExport} disabled={exporting} className="btn-gray">
                  <Download size={14} /> {exporting ? "Exporting…" : "Export CSV"}
                </button>
              </div>
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Amount (est.)</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded && transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">
                        No transactions yet
                      </td>
                    </tr>
                  )}
                  {transactions.map((t, i) => (
                    <tr key={t.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{new Date(t.occurred_at).toLocaleString()}</td>
                      <td className="px-5 py-3.5 capitalize text-[var(--color-text-secondary)]">{t.type}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-primary)]">{t.description}</td>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">${t.amount.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-[var(--color-text-tertiary)]">
              Amounts are estimated from call duration and SMS volume — they are not Telnyx's own itemized invoice.
            </p>
          </>
        )}
      </div>

      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </div>
  );
}

function TopUpModal({ open, onClose }) {
  const [amount, setAmount] = useState(TOP_UP_AMOUNTS[1]);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const chosenAmount = useCustom ? Number(customAmount) || 0 : amount;

  const handleConfirm = () => {
    window.open(TELNYX_BILLING_URL, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <SidePanel open={open} onClose={onClose} title="Top Up Credits" subtitle="Add funds to your Telnyx balance">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2.5">
          {TOP_UP_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAmount(a);
                setUseCustom(false);
              }}
              className={`rounded-lg border-2 px-4 py-3 text-center font-semibold transition-colors ${
                !useCustom && amount === a
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/50"
              }`}
            >
              ${a}
            </button>
          ))}
          <button
            onClick={() => setUseCustom(true)}
            className={`col-span-2 rounded-lg border-2 px-4 py-3 text-center font-semibold transition-colors ${
              useCustom
                ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/50"
            }`}
          >
            Custom Amount
          </button>
        </div>

        {useCustom && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Amount (USD)</label>
            <input
              type="number"
              min="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="e.g. 150"
              className="input-field"
              autoFocus
            />
          </div>
        )}

        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          You will be redirected to Telnyx to complete payment.
        </p>

        <button onClick={handleConfirm} disabled={chosenAmount <= 0} className="btn-purple w-full py-3">
          <ExternalLink size={15} /> Continue to Telnyx (${chosenAmount || 0})
        </button>

        <p className="text-xs text-[var(--color-text-tertiary)]">
          Add credits in Telnyx portal, then return here — balance updates automatically.
        </p>
      </div>
    </SidePanel>
  );
}
