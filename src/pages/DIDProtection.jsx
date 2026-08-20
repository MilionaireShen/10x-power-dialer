import { useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

const WEIGHT_LABELS = {
  answerRate: "Answer rate weight",
  connectRate: "Connect rate weight",
  avgDuration: "Average call duration weight",
  shortCallPct: "Short call percentage weight",
  dncRequests: "DNC requests weight",
  complaints: "Complaints weight",
  numberAge: "Number age weight",
  registration: "Registration status weight",
};

const THRESHOLD_LABELS = { healthy: "Healthy threshold", warning: "Warning threshold", critical: "Critical threshold", autoPause: "Auto-pause threshold" };

export default function DIDProtection() {
  const { campaigns, didSettings, campaignDidOverrides, updateCampaignDidOverride } = useAppData();
  const { notify } = useToast();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");

  const override = campaignDidOverrides[campaignId] ?? {};
  const campaign = campaigns.find((c) => c.id === campaignId);

  const setOverride = (section, patch) => {
    const current = override[section] ?? { enabled: false, value: didSettings[section] };
    updateCampaignDidOverride(campaignId, section, { ...current, ...patch });
  };

  const toggleSection = (section) => {
    const current = override[section];
    if (current?.enabled) {
      setOverride(section, { enabled: false });
    } else {
      setOverride(section, { enabled: true, value: current?.value ?? didSettings[section] });
      notify(`Custom ${section} override enabled for ${campaign?.name}.`, "info");
    }
  };

  const updateValue = (section, patch) => {
    const current = override[section];
    const base = current?.value ?? didSettings[section];
    const nextValue = Array.isArray(patch) ? patch : { ...base, ...patch };
    setOverride(section, { enabled: true, value: nextValue });
  };

  return (
    <div>
      <ScreenHeader
        category="Campaigns"
        title="DID Protection"
        actions={
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field w-auto">
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      />
      <div className="p-8 space-y-6">
        <div className="card border border-[var(--color-accent)]/25 bg-[var(--color-accent-tint)] text-sm text-[var(--color-text-primary)]">
          These settings apply only to <span className="font-semibold">{campaign?.name}</span>. Any section left on "Use global default" always follows{" "}
          <span className="font-semibold">Phone System → DID Reputation Settings</span> — even if that changes later.
        </div>

        <OverrideSection title="Health Score Weights" section="weights" overrideConfig={override.weights} onToggle={() => toggleSection("weights")}>
          {(value) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.keys(WEIGHT_LABELS).map((key) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{WEIGHT_LABELS[key]}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={value[key]}
                      disabled={!override.weights?.enabled}
                      onChange={(e) => updateValue("weights", { [key]: Number(e.target.value) })}
                      className="w-full accent-[var(--color-accent)] disabled:opacity-50"
                    />
                    <span className="w-10 shrink-0 text-right text-sm font-semibold text-[var(--color-text-primary)]">{value[key]}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OverrideSection>

        <OverrideSection title="Score Thresholds" section="thresholds" overrideConfig={override.thresholds} onToggle={() => toggleSection("thresholds")}>
          {(value) => (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.keys(THRESHOLD_LABELS).map((key) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{THRESHOLD_LABELS[key]}</label>
                  <input
                    type="number"
                    value={value[key]}
                    disabled={!override.thresholds?.enabled}
                    onChange={(e) => updateValue("thresholds", { [key]: Number(e.target.value) })}
                    className="input-field disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          )}
        </OverrideSection>

        <OverrideSection title="Cooling Rules" section="cooling" overrideConfig={override.cooling} onToggle={() => toggleSection("cooling")}>
          {(value) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <OverrideNumberField label="Maximum calls per day" value={value.maxCallsPerDay} disabled={!override.cooling?.enabled} onChange={(v) => updateValue("cooling", { maxCallsPerDay: v })} />
              <OverrideNumberField label="Maximum calls per hour" value={value.maxCallsPerHour} disabled={!override.cooling?.enabled} onChange={(v) => updateValue("cooling", { maxCallsPerHour: v })} />
              <OverrideNumberField label="Minimum answer rate (%)" value={value.minAnswerRate} disabled={!override.cooling?.enabled} onChange={(v) => updateValue("cooling", { minAnswerRate: v })} />
              <OverrideNumberField
                label="Maximum short call percentage (%)"
                value={value.maxShortCallPct}
                disabled={!override.cooling?.enabled}
                onChange={(v) => updateValue("cooling", { maxShortCallPct: v })}
              />
              <OverrideNumberField
                label="Maximum DNC requests before cooling"
                value={value.maxDncRequests}
                disabled={!override.cooling?.enabled}
                onChange={(v) => updateValue("cooling", { maxDncRequests: v })}
              />
              <OverrideNumberField
                label="Cooling period duration (hours)"
                value={value.coolingPeriodHours}
                disabled={!override.cooling?.enabled}
                onChange={(v) => updateValue("cooling", { coolingPeriodHours: v })}
              />
              <OverrideNumberField label="Resume minimum score required" value={value.resumeMinScore} disabled={!override.cooling?.enabled} onChange={(v) => updateValue("cooling", { resumeMinScore: v })} />
            </div>
          )}
        </OverrideSection>

        <OverrideSection title="Alert Thresholds" section="alerts" overrideConfig={override.alerts} onToggle={() => toggleSection("alerts")}>
          {(value) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <OverrideNumberField label="Alert when score drops below" value={value.scoreBelow} disabled={!override.alerts?.enabled} onChange={(v) => updateValue("alerts", { scoreBelow: v })} />
              <OverrideNumberField
                label="Alert when answer rate drops below (%)"
                value={value.answerRateBelow}
                disabled={!override.alerts?.enabled}
                onChange={(v) => updateValue("alerts", { answerRateBelow: v })}
              />
              <OverrideNumberField label="Alert when DNC requests exceed" value={value.dncExceeds} disabled={!override.alerts?.enabled} onChange={(v) => updateValue("alerts", { dncExceeds: v })} />
            </div>
          )}
        </OverrideSection>

        <OverrideSection title="Registration Requirements" section="registration" overrideConfig={override.registration} onToggle={() => toggleSection("registration")}>
          {(value) => (
            <div className="space-y-3">
              <OverrideToggle
                label="Require registration for dialing"
                checked={value.requireRegistration}
                disabled={!override.registration?.enabled}
                onChange={() => updateValue("registration", { requireRegistration: !value.requireRegistration })}
              />
              <OverrideToggle
                label="Block unregistered numbers"
                checked={value.blockUnregistered}
                disabled={!override.registration?.enabled}
                onChange={() => updateValue("registration", { blockUnregistered: !value.blockUnregistered })}
              />
              <OverrideToggle
                label="Alert on unregistered numbers"
                checked={value.alertOnUnregistered}
                disabled={!override.registration?.enabled}
                onChange={() => updateValue("registration", { alertOnUnregistered: !value.alertOnUnregistered })}
              />
            </div>
          )}
        </OverrideSection>
      </div>
    </div>
  );

  function OverrideSection({ title, section, overrideConfig, onToggle, children }) {
    const isOverridden = Boolean(overrideConfig?.enabled);
    const value = overrideConfig?.value ?? didSettings[section];
    return (
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
            <span
              className="pill text-[10px]"
              style={{
                backgroundColor: isOverridden ? "var(--color-accent-tint)" : "var(--color-bg)",
                color: isOverridden ? "var(--color-accent)" : "var(--color-text-tertiary)",
              }}
            >
              {isOverridden ? "Custom for this campaign" : "Using global default"}
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
            {isOverridden ? "Override for this campaign" : "Use global default"}
            <button
              onClick={onToggle}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${isOverridden ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
            >
              <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${isOverridden ? "translate-x-5" : ""}`} />
            </button>
          </label>
        </div>
        {children(value)}
      </section>
    );
  }
}

function OverrideNumberField({ label, value, disabled, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input type="number" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="input-field disabled:opacity-50" />
    </div>
  );
}

function OverrideToggle({ label, checked, disabled, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
      >
        <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
