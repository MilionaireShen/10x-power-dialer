import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import dialerService from "../services/dialerService";
import { useToast } from "../lib/ToastContext";

// Live dialer control for one campaign — the piece that was missing.
// "Set campaign to Active" only flips a status column; it never told the
// backend dialing engine to begin. This calls POST /dialer/start, which
// creates the campaign_dialer_state row the tick loop runs on, and then
// shows the real state the engine reports back (GET /dialer/status).
//
// Nothing here fakes progress: every number shown — agents available,
// leads remaining, calls active — comes straight from the engine.

const POLL_MS = 5000;

// Maps the backend `state` enum to how it should read on screen.
const STATE_LABEL = {
  running: { text: "Dialing", tone: "success" },
  waiting_for_agent: { text: "Waiting for an available agent", tone: "warning" },
  exhausted: { text: "No eligible leads left", tone: "warning" },
  paused: { text: "Paused", tone: "warning" },
  not_started: { text: "Ready to start", tone: "neutral" },
};

function toneStyle(tone) {
  const c =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : tone === "danger"
          ? "var(--color-danger)"
          : "var(--color-text-tertiary)";
  return {
    backgroundColor: `color-mix(in srgb, ${c} 14%, white)`,
    color: c,
  };
}

function describe(status) {
  if (!status) return { text: "Loading dialer state…", tone: "neutral" };
  if (status.state && STATE_LABEL[status.state]) return STATE_LABEL[status.state];
  if (typeof status.state === "string" && status.state.startsWith("blocked_")) {
    return { text: status.blocked_reason || "Campaign can't dial yet", tone: "danger" };
  }
  return { text: status.status || "Unknown", tone: "neutral" };
}

export default function CampaignDialerControl({ campaignId, mode, campaignStatus }) {
  const { notify } = useToast();
  const [status, setStatus] = useState(null);
  const [preflight, setPreflight] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await dialerService.status(campaignId);
      setStatus(res.data);
    } catch {
      // keep last-known on screen
    }
  }, [campaignId]);

  const loadPreflight = useCallback(async () => {
    try {
      const res = await dialerService.preflight(campaignId);
      setPreflight(res.data);
    } catch {
      setPreflight(null);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
    loadPreflight();
    timer.current = setInterval(load, POLL_MS);
    return () => clearInterval(timer.current);
  }, [load, loadPreflight]);

  // `status` (the DB run-state) is authoritative for which controls to show;
  // `is_running` additionally requires a live tick loop and is only true for
  // auto modes, so it can't gate the Pause/Stop buttons on its own.
  const isRunning = status?.status === "running";
  const isPaused = status?.status === "paused";

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      notify(okMsg, "success");
      await load();
      await loadPreflight();
    } catch (err) {
      notify(err?.message || "Dialer action failed.", "error");
      await loadPreflight();
    } finally {
      setBusy(false);
    }
  };

  const d = describe(status);
  const blockers = preflight
    ? Object.entries(preflight.checks || {}).filter(([, v]) => v === false)
    : [];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Dialer{mode ? ` · ${mode}` : ""}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="pill text-[11px]" style={toneStyle(d.tone)}>
              {isRunning && <Loader2 size={11} className="mr-1 inline animate-spin" />}
              {d.text}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {!isRunning && (
            <button
              onClick={() => act(() => dialerService.start(campaignId), "Dialer started.")}
              disabled={busy || (preflight && !preflight.ok)}
              className="btn-purple disabled:opacity-40"
              title={preflight && !preflight.ok ? preflight.reason : "Start the dialing engine for this campaign"}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Start
            </button>
          )}
          {isRunning && (
            <button
              onClick={() => act(() => dialerService.pause(campaignId), "Dialer paused.")}
              disabled={busy}
              className="btn-gray disabled:opacity-40"
            >
              <Pause size={14} /> Pause
            </button>
          )}
          {(isRunning || isPaused) && (
            <button
              onClick={() => act(() => dialerService.stop(campaignId), "Dialer stopped.")}
              disabled={busy}
              className="btn-outline disabled:opacity-40"
            >
              <Square size={14} /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Live engine figures — real, from GET /dialer/status */}
      {status && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Agents available" value={status.agents_available ?? 0} />
          <Stat label="Calls active" value={status.calls_active ?? 0} />
          <Stat label="Leads remaining" value={status.leads_remaining ?? 0} />
        </div>
      )}

      {/* Why it can't start yet */}
      {preflight && !preflight.ok && (
        <div className="flex items-start gap-2 rounded-md bg-[var(--color-danger-tint)] px-3 py-2 text-xs text-[var(--color-danger)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{preflight.reason}</p>
            {blockers.length > 1 && (
              <ul className="mt-1 list-disc pl-4">
                {blockers.map(([k]) => (
                  <li key={k}>{k.replace(/_/g, " ")}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {preflight?.ok && !isRunning && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
          <CheckCircle2 size={13} className="text-[var(--color-success)]" />
          All checks pass — {preflight.detail?.pending_leads?.toLocaleString?.() ?? preflight.detail?.pending_leads} leads ready.
        </div>
      )}

      {preflight?.warnings?.length > 0 && (
        <p className="text-[11px] text-[var(--color-text-tertiary)]">{preflight.warnings.join(" ")}</p>
      )}

      {mode === "preview" && isRunning && (
        <p className="text-[11px] text-[var(--color-text-tertiary)]">
          Preview mode — each agent pulls their next lead from their own screen.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-[var(--color-bg)] py-2">
      <p className="text-base font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}
