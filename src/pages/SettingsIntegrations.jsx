import { useCallback, useEffect, useState } from "react";
import {
  Plug, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Loader2,
  RefreshCw, Wallet, PlayCircle, Info,
} from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import IntegrationPanel from "../components/IntegrationPanel";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import { INTEGRATION_CATALOGUE, EMPTY_CONFIG } from "../lib/integrationCatalogue";
import adminService from "../services/adminService";

// Every status on this page came from a request the backend actually made.
// Nothing is inferred from a saved config, and nothing says "Connected"
// because somebody flipped a switch.
const STATUS_META = {
  connected: { label: "Connected", Icon: CheckCircle2, bg: "var(--color-success-tint)", fg: "var(--color-success)" },
  degraded: { label: "Connection Error", Icon: AlertTriangle, bg: "var(--color-warning-tint)", fg: "var(--color-warning)" },
  error: { label: "Connection Error", Icon: XCircle, bg: "var(--color-danger-tint)", fg: "var(--color-danger)" },
  testing: { label: "Testing Connection", Icon: Loader2, bg: "var(--color-info-tint)", fg: "var(--color-info)" },
  not_configured: { label: "Not Connected", Icon: HelpCircle, bg: "var(--color-bg)", fg: "var(--color-text-tertiary)" },
};

function money(amount, currency) {
  if (amount === null || amount === undefined) return "—";
  const n = Number(amount);
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}${currency ? ` ${currency}` : ""}`;
}

function when(iso) {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function SettingsIntegrations() {
  const { notify } = useToast();
  const [integrations, setIntegrations] = useState([]);
  const [verifiable, setVerifiable] = useState([]);
  const [funding, setFunding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openProvider, setOpenProvider] = useState(null);

  const load = useCallback(async () => {
    try {
      const [i, f] = await Promise.all([
        adminService.listIntegrations(),
        adminService.fundingStatus().catch(() => null),
      ]);
      setIntegrations(i?.data?.integrations || []);
      setVerifiable(i?.data?.verifiable_providers || []);
      setFunding(f?.data || null);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load integrations.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const test = async (provider) => {
    setTesting(provider);
    try {
      const res = await adminService.testIntegration(provider);
      const status = res?.data?.status;
      notify(res?.message || "Connection tested.", status === "connected" ? "success" : "warning");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "The connection test failed.", "error");
    } finally {
      setTesting(null);
    }
  };

  const refreshBalance = async () => {
    setRefreshing(true);
    try {
      // Forces a live read rather than the cached figure the job keeps warm.
      const res = await adminService.fundingStatus({ refresh: true });
      setFunding(res?.data || null);
      notify("Balance refreshed.", "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not refresh the balance.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  // Merges what the product offers with what the backend has verified, so an
  // untouched integration appears as available rather than being hidden.
  const rows = [
    ...integrations.filter((i) => i.provider === "telnyx"),
    ...INTEGRATION_CATALOGUE.map((entry) => {
      const live = integrations.find((i) => i.provider === entry.provider);
      return {
        ...entry,
        ...(live || {}),
        provider: entry.provider,
        name: entry.name,
        description: entry.description,
        type: entry.type,
        status: live?.status || "not_configured",
        config: live?.config && Object.keys(live.config).length ? live.config : (EMPTY_CONFIG[entry.type] || {}),
      };
    }),
  ];

  const open = rows.find((r) => r.provider === openProvider && !r.platform_managed) ?? null;

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Integrations"
        actions={
          <button onClick={load} className="btn-outline py-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="space-y-6 p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : (
          <>
            <FundingCard
              funding={funding}
              onRefresh={refreshBalance}
              refreshing={refreshing}
              onChanged={load}
            />

            <p className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
              <Info size={13} className="mt-px shrink-0" />
              API keys and secrets are held in the server environment and never sent to this page. A status
              here is the result of a real request to the provider — not a saved setting.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((i) => {
                const meta = STATUS_META[testing === i.provider ? "testing" : i.status] || STATUS_META.not_configured;
                const Icon = meta.Icon;
                const canVerify = verifiable.includes(i.provider);
                return (
                  <div key={i.provider} className="card flex flex-col">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
                          <Plug size={16} />
                        </span>
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {i.name || i.provider}
                          </p>
                          {i.platform_managed && (
                            <p className="text-[10px] text-[var(--color-text-tertiary)]">Platform account</p>
                          )}
                        </div>
                      </div>
                      <span className="pill shrink-0" style={{ backgroundColor: meta.bg, color: meta.fg }}>
                        <Icon size={11} className={`mr-1 inline ${testing === i.provider ? "animate-spin" : ""}`} />
                        {meta.label}
                      </span>
                    </div>

                    <p className="mb-3 text-xs text-[var(--color-text-tertiary)]">
                      {i.description || "Telephony, messaging and numbers for this platform."}
                    </p>

                    {/* The provider's own words, so an admin can act on the
                        actual problem rather than "connection failed". */}
                    {i.last_error && i.status !== "connected" && (
                      <p className="mb-3 rounded-lg bg-[var(--color-bg)] px-2.5 py-2 text-[11px] text-[var(--color-text-secondary)]">
                        {i.last_error_code ? `${i.last_error_code}: ` : ""}{i.last_error}
                      </p>
                    )}

                    <dl className="mb-3 space-y-1 text-[11px] text-[var(--color-text-tertiary)]">
                      <div className="flex justify-between">
                        <dt>Last checked</dt><dd>{when(i.last_checked_at)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Last success</dt><dd>{when(i.last_success_at)}</dd>
                      </div>
                    </dl>

                    <div className="mt-auto flex gap-2">
                      <button
                        onClick={() => test(i.provider)}
                        disabled={testing === i.provider}
                        title={canVerify ? "Run a real connection test" : "No automated test exists for this provider yet"}
                        className="btn-outline flex-1 py-1.5 text-xs disabled:opacity-40"
                      >
                        {testing === i.provider ? "Testing…" : "Test Connection"}
                      </button>
                      {!i.platform_managed && (
                        <button
                          onClick={() => setOpenProvider(i.provider)}
                          className="btn-purple flex-1 py-1.5 text-xs"
                        >
                          Configure
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <IntegrationPanel
        integration={open ? { ...open, id: open.provider, connected: open.status === "connected" } : null}
        onClose={() => setOpenProvider(null)}
        onConnect={async (config) => {
          try {
            await adminService.saveIntegration({ provider: open.provider, config });
            notify("Settings saved. Run Test Connection to verify it works.", "success");
            setOpenProvider(null);
            load();
          } catch (err) {
            notify(err?.response?.data?.message || "Could not save this integration.", "error");
          }
        }}
        onDisconnect={async () => {
          try {
            await adminService.disconnectIntegration(open.provider);
            notify(`${open.name} disconnected.`, "warning");
            setOpenProvider(null);
            load();
          } catch (err) {
            notify(err?.response?.data?.message || "Could not disconnect this integration.", "error");
          }
        }}
      />
    </div>
  );
}

/** The real account balance, the thresholds acting on it, and what it caused. */
function FundingCard({ funding, onRefresh, refreshing, onChanged }) {
  const { notify } = useToast();
  const [warn, setWarn] = useState("");
  const [stop, setStop] = useState("");
  const [saving, setSaving] = useState(false);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!funding?.settings) return;
    setWarn(String(funding.settings.low_balance_threshold ?? ""));
    setStop(String(funding.settings.minimum_operating_balance ?? ""));
  }, [funding]);

  if (!funding) {
    return (
      <div className="card">
        <EmptyState
          icon={Wallet}
          title="Account balance unavailable"
          description="You do not have permission to view telephony funding, or the balance could not be read."
        />
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await adminService.saveFundingSettings({
        low_balance_threshold: Number(warn),
        minimum_operating_balance: Number(stop),
      });
      notify("Funding settings saved.", "success");
      onChanged?.();
    } catch (err) {
      // The server refuses a warning threshold at or below the stop threshold,
      // and explains why — passed straight through.
      notify(err?.response?.data?.message || "Could not save funding settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const resume = async () => {
    setResuming(true);
    try {
      const res = await adminService.resumePausedCampaigns();
      notify(res?.message || "Campaigns resumed.", "success");
      onChanged?.();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not resume campaigns.", "error");
    } finally {
      setResuming(false);
    }
  };

  const tone = funding.out_of_funds ? "danger" : funding.low_balance ? "warning" : "success";
  const toneColor = {
    danger: "var(--color-danger)", warning: "var(--color-warning)", success: "var(--color-success)",
  }[tone];

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            <Wallet size={13} /> Telephony Account Balance
          </p>
          {funding.balance_error ? (
            <>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text-tertiary)]">Unavailable</p>
              <p className="mt-1 text-xs text-[var(--color-danger)]">{funding.balance_error}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-3xl font-semibold" style={{ color: toneColor }}>
                {money(funding.balance?.available ?? funding.balance?.amount, funding.balance?.currency)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                Balance {money(funding.balance?.amount, funding.balance?.currency)}
                {Number(funding.balance?.credit_limit) > 0
                  ? ` + ${money(funding.balance.credit_limit, funding.balance.currency)} credit`
                  : ""}
                {" · checked "}{when(funding.balance_checked_at)}
              </p>
            </>
          )}
        </div>

        <button onClick={onRefresh} disabled={refreshing} className="btn-outline py-1.5 text-sm disabled:opacity-40">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh Balance"}
        </button>
      </div>

      {funding.paused_campaigns?.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-tint)] p-3">
          <p className="text-sm font-semibold text-[var(--color-danger)]">
            {funding.paused_campaigns.length} campaign{funding.paused_campaigns.length === 1 ? "" : "s"} paused for insufficient funds
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-[var(--color-text-secondary)]">
            {funding.paused_campaigns.map((c) => (
              <li key={c.id}>
                {c.name} — {c.pause_reason} (paused {when(c.auto_paused_at)})
              </li>
            ))}
          </ul>
          <button onClick={resume} disabled={resuming} className="btn-outline mt-2.5 py-1.5 text-xs disabled:opacity-40">
            <PlayCircle size={13} /> {resuming ? "Resuming…" : "Resume these campaigns"}
          </button>
          <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
            Only campaigns paused automatically are listed. Anything paused by hand stays paused.
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[var(--color-border)] pt-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Low balance warning at
          </span>
          <input type="number" min={0} step="0.01" value={warn} onChange={(e) => setWarn(e.target.value)} className="input-field py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Stop calling at
          </span>
          <input type="number" step="0.01" value={stop} onChange={(e) => setStop(e.target.value)} className="input-field py-2 text-sm" />
        </label>
        <div className="flex items-end">
          <button onClick={save} disabled={saving} className="btn-purple w-full py-2 text-sm disabled:opacity-40">
            {saving ? "Saving…" : "Save Thresholds"}
          </button>
        </div>
      </div>

      {funding.recent_events?.length > 0 && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Recent funding events
          </p>
          <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
            {funding.recent_events.slice(0, 6).map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span>{e.event.replace(/_/g, " ")}</span>
                <span className="shrink-0 text-[var(--color-text-tertiary)]">
                  {e.balance !== null ? money(e.balance, e.currency) : ""} · {when(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
