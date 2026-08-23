import { useCallback, useEffect, useState } from "react";
import { Mic, Info, RefreshCw } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// These switches now govern whether a call is actually recorded. They
// previously changed a value in browser state while the recorder ran with
// recording hard-coded on, so every call was recorded whatever they said.

function Toggle({ on, onChange, disabled, label }) {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={disabled}
      aria-label={label}
      className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-40 ${on ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
    >
      <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function PhoneSystemRecording() {
  const { notify } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminService.getRecordingSettings();
      setData(res?.data || null);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load recording settings.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const save = async (payload, key) => {
    setBusy(key);
    try {
      await adminService.saveRecordingSettings(payload);
      notify("Recording settings saved.", "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save recording settings.", "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div>
        <ScreenHeader category="Phone System" title="Call Recording Settings" />
        <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <ScreenHeader category="Phone System" title="Call Recording Settings" />
        <div className="p-8">
          <EmptyState icon={Mic} title="Could not load recording settings" description={error || "No data returned."} />
        </div>
      </div>
    );
  }

  const companyOn = data.company.enabled;

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title="Call Recording Settings"
        actions={
          <button onClick={load} className="btn-outline py-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
      <div className="space-y-6 p-8">
        {/* Which recording method is actually in use, so the screen is not
            describing a provider feature the platform does not use. */}
        <p className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
          <Info size={13} className="mt-px shrink-0" />
          {data.method_description} {data.recordings_stored} recording{data.recordings_stored === 1 ? "" : "s"} stored.
        </p>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Record All Calls</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Switching this off stops recording everywhere, whatever the per-campaign and per-number settings say.
            </p>
          </div>
          <Toggle
            on={companyOn}
            disabled={busy === "company"}
            label="Record all calls"
            onChange={(next) => save({ company: { ...data.company, enabled: next } }, "company")}
          />
        </div>

        <div className="card p-0">
          <h3 className="border-b border-[var(--color-border)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            By Campaign
          </h3>
          {data.campaigns.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--color-text-tertiary)]">No campaigns yet.</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {data.campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{c.name}</span>
                  <Toggle
                    on={c.recording_enabled !== false && companyOn}
                    disabled={!companyOn || busy === c.id}
                    label={`Record calls on ${c.name}`}
                    onChange={(next) => save({ campaign_id: c.id, enabled: next }, c.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-0">
          <h3 className="border-b border-[var(--color-border)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            By Number
          </h3>
          {data.numbers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--color-text-tertiary)]">No DIDs configured.</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {data.numbers.map((n) => (
                <div key={n.id} className="flex items-center justify-between px-5 py-3.5">
                  <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">{n.phone_number}</span>
                  <Toggle
                    on={n.recording_enabled !== false && companyOn}
                    disabled={!companyOn || busy === n.id}
                    label={`Record calls on ${n.phone_number}`}
                    onChange={(next) => save({ number_id: n.id, enabled: next }, n.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {!companyOn && (
          <p className="text-xs text-[var(--color-warning)]">
            Recording is off company-wide, so the per-campaign and per-number switches have no effect until it is turned back on.
          </p>
        )}
      </div>
    </div>
  );
}
