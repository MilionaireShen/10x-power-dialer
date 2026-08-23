import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Activity, HelpCircle } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import ScoreGauge from "../components/ScoreGauge";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// Everything here is computed from this number's real calls. The score, the
// rates and the outcome split all come from the backend, which reads the calls
// table — the previous version reconstructed the outcome split arithmetically
// from two stored rates, which produced slices that corresponded to nothing.

const PERIODS = ["day", "week", "month"];
const PERIOD_LABEL = { day: "24 Hours", week: "This Week", month: "This Month" };

const BAND_COLOR = {
  healthy: "var(--color-success)",
  warning: "var(--color-warning)",
  critical: "#EA580C",
  remove: "var(--color-danger)",
  unscored: "var(--color-text-tertiary)",
};

function minSec(seconds) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function TrendIcon({ trend }) {
  if (trend === "improving") return <TrendingUp size={14} className="text-[var(--color-success)]" />;
  if (trend === "declining") return <TrendingDown size={14} className="text-[var(--color-danger)]" />;
  return <Minus size={14} className="text-[var(--color-text-tertiary)]" />;
}

export default function DIDHealthReport() {
  const { didId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [period, setPeriod] = useState("week");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Rescores this number on open, so the report reflects calls made up to
      // this moment rather than whenever the hourly job last ran.
      const res = await adminService.didHealth(didId, { period });
      setReport(res?.data || null);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load this number's health.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [didId, period, notify]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <ScreenHeader category="Phone System" title="DID Health Report" />
        <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div>
        <ScreenHeader category="Phone System" title="DID Health Report" />
        <div className="p-8">
          <EmptyState icon={Activity} title="Could not load this number" description={error || "This DID could not be found."} />
        </div>
      </div>
    );
  }

  const { did, health, band, history, events, outcomes } = report;
  const color = BAND_COLOR[band.key] || BAND_COLOR.unscored;
  const unscored = health.score === null;

  const slices = [
    { label: "Connected", value: outcomes.connected, color: "var(--color-success)" },
    { label: "Answered, then hung up", value: outcomes.answered_short, color: "var(--color-warning)" },
    { label: "No answer / rejected", value: outcomes.no_answer, color: "var(--color-text-tertiary)" },
  ];
  const totalOutcomes = outcomes.total || 1;
  let cumulative = 0;
  const gradient = slices.map((s) => {
    const start = (cumulative / totalOutcomes) * 100;
    cumulative += s.value;
    return `${s.color} ${start}% ${(cumulative / totalOutcomes) * 100}%`;
  }).join(", ");

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title={did.phone_number}
        actions={
          <button onClick={() => navigate("/admin/phone-system/did-management")} className="btn-outline py-1.5 text-sm">
            <ArrowLeft size={14} /> Back to DIDs
          </button>
        }
      />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card flex flex-col items-center justify-center text-center">
            {unscored ? (
              <>
                <HelpCircle size={40} className="text-[var(--color-text-tertiary)]" />
                <p className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">Not enough data</p>
                {/* Said plainly rather than showing a number built from almost
                    nothing. A score here would be read as a judgement about the
                    number when it is really a judgement about the sample. */}
                <p className="mt-1 max-w-xs text-xs text-[var(--color-text-tertiary)]">
                  {health.unscored_reason || "This number has not made enough calls to be scored."}
                </p>
              </>
            ) : (
              <>
                <ScoreGauge score={health.score} color={color} />
                <p className="mt-3 text-lg font-semibold" style={{ color }}>{band.label}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                  <TrendIcon trend={health.score_trend} />
                  {health.score_change === null
                    ? "First score"
                    : `${health.score_change > 0 ? "+" : ""}${health.score_change} since last check`}
                </p>
                <p className="mt-3 max-w-xs text-xs text-[var(--color-text-secondary)]">{band.action}</p>
              </>
            )}
          </div>

          <div className="card lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
              Measured over the last {health.scoring_window_days} days
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Metric label="Calls" value={health.calls_in_window} />
              <Metric label="Answer rate" value={health.answer_rate === null ? "—" : `${health.answer_rate}%`} />
              <Metric label="Connect rate" value={health.connect_rate === null ? "—" : `${health.connect_rate}%`} />
              <Metric label="Avg duration" value={minSec(health.avg_call_duration_seconds)} />
              <Metric label="Short calls" value={health.short_call_percentage === null ? "—" : `${health.short_call_percentage}%`} />
              <Metric label="Rejected" value={health.rejections_count} />
              <Metric label="DNC requests" value={health.dnc_requests_count} />
              <Metric label="Complaints" value={health.complaints_count} />
              <Metric label="Number age" value={`${health.number_age_days}d`} />
            </div>
            <p className="mt-3 text-[11px] text-[var(--color-text-tertiary)]">
              Today {health.calls_today} · this hour {health.calls_this_hour} ·
              {" "}last calculated {new Date(health.last_calculated_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* What actually made up the score, so a number dropping out of the
            pool can be explained rather than just observed. */}
        {!unscored && Object.keys(health.score_breakdown || {}).length > 0 && (
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">What produced this score</h3>
            <div className="space-y-2">
              {Object.entries(health.score_breakdown).map(([key, c]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs capitalize text-[var(--color-text-secondary)]">
                    {key.replace(/_/g, " ")}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
                    <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${c.normalised}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-[11px] text-[var(--color-text-tertiary)]">
                    {c.contribution} of {c.weight} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Call outcomes</h3>
              <div className="flex overflow-hidden rounded-full border border-[var(--color-border-strong)]">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${period === p ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)]"}`}
                  >
                    {PERIOD_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            {outcomes.total === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
                No calls on this number in {PERIOD_LABEL[period].toLowerCase()}.
              </p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
                <div className="space-y-1.5">
                  {slices.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[var(--color-text-secondary)]">{s.label}</span>
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {s.value} ({Math.round((s.value / totalOutcomes) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Score history</h3>
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
                No score history for this period yet. Scores are recorded as the number is used.
              </p>
            ) : (
              <div className="flex h-32 items-end gap-1">
                {history.map((h) => (
                  <div
                    key={h.id}
                    title={`${h.score} on ${new Date(h.recorded_at).toLocaleString()}`}
                    className="flex-1 rounded-t bg-[var(--color-accent)]"
                    style={{ height: `${Math.max(4, h.score)}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Events</h3>
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-text-tertiary)]">
              No events recorded for this number.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {events.slice(0, 15).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="text-[var(--color-text-primary)]">
                    {e.event_type.replace(/_/g, " ")}
                    {e.event_description ? ` — ${e.event_description}` : ""}
                  </span>
                  <span className="shrink-0 text-[var(--color-text-tertiary)]">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg)] px-3 py-2.5">
      <p className="text-lg font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[11px] text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}
