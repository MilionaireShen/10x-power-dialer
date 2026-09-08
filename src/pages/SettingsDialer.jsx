import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// These settings reach the dialing engine. Calling hours are enforced against
// each lead's own local time when timezone intelligence is on, and the wrap-up
// time is the default given to agents after a call.
//
// Previously the screen wrote to React state only, so none of it was stored
// and none of it was enforced — an admin could narrow the calling window and
// the dialer would carry on using the built-in 8am–9pm regardless.
const SETTING_KEY = "dialer";
const DEFAULTS = {
  default_wrapup_seconds: 30,
  calling_hours_start: "08:00",
  calling_hours_end: "21:00",
  timezone_intelligence: true,
  auto_logout_enabled: false,
  auto_logout_minutes: 30,
  // Parallel dialing — off by default. Turning it on is what lets any
  // campaign set to the Parallel dialing mode actually dial; the campaign
  // setting alone does nothing while this is off.
  parallel_dialing_enabled: false,
  max_parallel_dials: 5,
  default_parallel_dials: 1,
  // Telnyx Answering Machine Detection — a paid, per-call feature, so this
  // stays off unless explicitly turned on here.
  amd_enabled: false,
};
const PARALLEL_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function SettingsDialer() {
  const { notify } = useToast();
  const [settings, setSettings] = useState(DEFAULTS);
  const [baseline, setBaseline] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getSettings()
      .then((res) => {
        if (cancelled) return;
        const merged = { ...DEFAULTS, ...(res?.data?.settings?.[SETTING_KEY] || {}) };
        setSettings(merged);
        setBaseline(merged);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = JSON.stringify(settings) !== JSON.stringify(baseline);
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  const save = async () => {
    // Refused here rather than saved and quietly ignored by the backend: a
    // window that ends before it starts would block every call, and the
    // admin should hear about it now, not from a silent dialer later.
    if (settings.calling_hours_start >= settings.calling_hours_end) {
      notify("Calling hours must start before they end.", "error");
      return;
    }
    setSaving(true);
    try {
      await adminService.saveSettings({ [SETTING_KEY]: settings });
      setBaseline(settings);
      notify("Dialer settings saved.", "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save these settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const {
    default_wrapup_seconds: wrapUp,
    calling_hours_start: start,
    calling_hours_end: end,
    timezone_intelligence: tzIntel,
    parallel_dialing_enabled: parallelEnabled,
    max_parallel_dials: maxParallel,
    default_parallel_dials: defaultParallel,
    amd_enabled: amdEnabled,
  } = settings;

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Dialer Settings"
        actions={
          <button onClick={save} disabled={!dirty || saving} className="btn-purple disabled:opacity-40">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        }
      />
      <div className="p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : (
          <div className="card max-w-xl space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Default Wrap-Up Time — {wrapUp}s</label>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={wrapUp}
                onChange={(e) => set({ default_wrapup_seconds: Number(e.target.value) })}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Default Calling Hours</label>
              <div className="flex items-center gap-3">
                <input type="time" value={start} onChange={(e) => set({ calling_hours_start: e.target.value })} className="input-field" />
                <span className="text-[var(--color-text-tertiary)]">to</span>
                <input type="time" value={end} onChange={(e) => set({ calling_hours_end: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Timezone Intelligence</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Default for new campaigns — auto-blocks calls outside calling hours in the lead's local time</p>
              </div>
              <button
                onClick={() => set({ timezone_intelligence: !tzIntel })}
                className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${tzIntel ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
              >
                <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${tzIntel ? "translate-x-5" : ""}`} />
              </button>
            </div>

            <div className="border-t border-[var(--color-border)] pt-5">
              <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Parallel Dialing</h3>
              <p className="mb-3 text-xs text-[var(--color-text-tertiary)]">
                Lets a campaign set to the Parallel dialing mode call several of an agent's leads at once — the first to
                answer connects, the rest end automatically.
              </p>

              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Parallel Dialing</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Off by default — a Parallel-mode campaign does nothing until this is on</p>
                </div>
                <button
                  onClick={() => set({ parallel_dialing_enabled: !parallelEnabled })}
                  className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${parallelEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                >
                  <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${parallelEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {parallelEnabled && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Maximum Parallel Dials Allowed</label>
                    <select
                      value={maxParallel}
                      onChange={(e) => {
                        const max = Number(e.target.value);
                        // An agent can never exceed this — clamp the default
                        // down with it so the two settings can't contradict
                        // each other.
                        set({ max_parallel_dials: max, default_parallel_dials: Math.min(defaultParallel, max) });
                      }}
                      className="input-field"
                    >
                      {PARALLEL_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">Subject to your Telnyx account's own concurrency/CPS limits.</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Default Parallel Dials</label>
                    <select
                      value={defaultParallel}
                      onChange={(e) => set({ default_parallel_dials: Number(e.target.value) })}
                      className="input-field"
                    >
                      {PARALLEL_OPTIONS.filter((n) => n <= maxParallel).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">Starting value for an agent who hasn't set their own yet.</p>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Answering Machine Detection</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    Telnyx charges per call for this — off by default. When on, a parallel-dial leg that reaches
                    voicemail is dispositioned and released automatically instead of waiting to be bridged.
                  </p>
                </div>
                <button
                  onClick={() => set({ amd_enabled: !amdEnabled })}
                  className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${amdEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                >
                  <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${amdEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
