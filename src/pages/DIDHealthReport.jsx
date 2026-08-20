import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import ScoreGauge from "../components/ScoreGauge";
import { useAppData } from "../lib/AppDataContext";
import { SCORE_BAND_COLOR, REGISTRATION_COLOR, COOLING_COLOR, formatMinSec, formatHoursRemaining, trendArrow } from "../lib/didDisplay";

const PERIODS = ["day", "week", "month"];
const PERIOD_LABEL = { day: "24 Hours", week: "This Week", month: "This Month" };

export default function DIDHealthReport() {
  const { didId } = useParams();
  const navigate = useNavigate();
  const { phoneNumbers, campaigns, getDIDHealth, getDIDTrend } = useAppData();
  const [period, setPeriod] = useState("week");

  const did = phoneNumbers.find((d) => d.id === didId);
  const health = did ? getDIDHealth(did.id) : null;
  const trend = did ? getDIDTrend(did.id, period) : null;

  if (!did || !health) {
    return (
      <div>
        <ScreenHeader category="Phone System" title="DID Health Report" />
        <div className="p-8">
          <div className="card text-center text-sm text-[var(--color-text-tertiary)]">This DID could not be found.</div>
        </div>
      </div>
    );
  }

  const campaignName = campaigns.find((c) => c.id === did.campaignId)?.name ?? "Unassigned";
  const color = SCORE_BAND_COLOR[health.status];

  const registrationEvents = did.events.filter((e) => e.type.startsWith("registration") || e.type === "spam_flag");
  const coolingEvents = did.events.filter((e) => ["cooling_started", "paused", "resumed", "carrier_block"].includes(e.type));

  // Derived call-outcome split from the two stored rates — no separate raw
  // outcome log is kept per call, so this reconstructs the breakdown.
  const connected = did.metrics.connectRate;
  const answeredNoConnect = Math.max(0, did.metrics.answerRate - did.metrics.connectRate);
  const noAnswer = Math.max(0, 100 - connected - answeredNoConnect);
  const pieSlices = [
    { label: "Connected", pct: connected, color: "var(--color-success)" },
    { label: "Answered, No Connect", pct: answeredNoConnect, color: "var(--color-warning)" },
    { label: "No Answer / Rejected", pct: noAnswer, color: "var(--color-text-tertiary)" },
  ];
  let cumulative = 0;
  const gradientStops = pieSlices
    .map((s) => {
      const start = cumulative;
      cumulative += s.pct;
      return `${s.color} ${start}% ${cumulative}%`;
    })
    .join(", ");

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title={`DID Health Report — ${did.number}`}
        actions={
          <button onClick={() => navigate("/admin/phone-system/did-management")} className="btn-gray">
            <ArrowLeft size={14} /> Back to DID Management
          </button>
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card flex flex-col items-center justify-center gap-3 py-8 lg:col-span-1">
            <ScoreGauge score={health.score} color={color} />
            <span className="pill" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, white)`, color }}>
              {health.status}
            </span>
            <div className="flex items-center gap-1 text-sm font-medium" style={{ color: health.trend.direction === "up" ? "var(--color-success)" : health.trend.direction === "down" ? "var(--color-danger)" : "var(--color-text-tertiary)" }}>
              {health.trend.direction === "up" ? <TrendingUp size={14} /> : health.trend.direction === "down" ? <TrendingDown size={14} /> : <Minus size={14} />}
              {health.trend.pointsChange > 0 ? "+" : ""}
              {health.trend.pointsChange} pts this week
            </div>
          </div>

          <div className="card lg:col-span-2">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Current Metrics</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Metric label="Answer Rate" value={`${did.metrics.answerRate}%`} />
              <Metric label="Connect Rate" value={`${did.metrics.connectRate}%`} />
              <Metric label="Avg. Duration" value={formatMinSec(did.metrics.avgDurationSec)} />
              <Metric label="Short Calls" value={`${did.metrics.shortCallPct}%`} />
              <Metric label="Calls Today" value={did.metrics.callsToday} />
              <Metric label="Calls This Hour" value={did.metrics.callsThisHour} />
              <Metric label="Total Calls" value={did.metrics.totalCalls.toLocaleString()} />
              <Metric label="DNC Requests" value={did.metrics.dncRequests} accent={did.metrics.dncRequests > 0 ? "text-[var(--color-danger)]" : undefined} />
              <Metric label="Complaints" value={did.metrics.complaints} accent={did.metrics.complaints > 0 ? "text-[var(--color-danger)]" : undefined} />
              <Metric label="Number Age" value={`${did.ageInDays} days`} />
              <Metric
                label="Registration"
                value={did.registrationStatus}
                accent={undefined}
                valueStyle={{ color: REGISTRATION_COLOR[did.registrationStatus] }}
              />
              <Metric label="Cooling Status" value={did.coolingStatus} valueStyle={{ color: COOLING_COLOR[did.coolingStatus] }} />
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Score History</h3>
              <div className="flex overflow-hidden rounded-full border border-[var(--color-border-strong)]">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                      period === p ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                    }`}
                  >
                    {PERIOD_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <ScoreSparkline history={trend.history} color={color} />
          </div>

          <div className="card">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Trend Analysis</h3>
            <div
              className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: trend.direction === "up" ? "var(--color-success-tint)" : trend.direction === "down" ? "var(--color-danger-tint)" : "var(--color-bg)",
                color: trend.direction === "up" ? "var(--color-success)" : trend.direction === "down" ? "var(--color-danger)" : "var(--color-text-secondary)",
              }}
            >
              {trendArrow(trend.direction)} {Math.abs(trend.delta)} points {PERIOD_LABEL[period].toLowerCase()}
            </div>
            {trend.factors.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">No significant contributing factors detected this period.</p>
            ) : (
              <ul className="space-y-1.5">
                {trend.factors.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[var(--color-text-secondary)]">
                    <span className="text-[var(--color-text-tertiary)]">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Call Outcome Breakdown</h3>
            <div className="flex items-center gap-6">
              <div className="h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradientStops})` }} />
              <div className="space-y-2">
                {pieSlices.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[var(--color-text-secondary)]">{s.label}</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{s.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Campaign Assignment History</h3>
            <div className="space-y-2">
              <div className="rounded-lg bg-[var(--color-bg)] px-3 py-2.5 text-sm">
                <span className="font-medium text-[var(--color-text-primary)]">Currently: </span>
                <span className="text-[var(--color-text-secondary)]">{campaignName}</span>
              </div>
              {(did.assignmentHistory ?? []).map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                  <span className="text-[var(--color-text-primary)]">{h.campaignName}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {new Date(h.from).toLocaleDateString()} — {h.to ? new Date(h.to).toLocaleDateString() : "present"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <HistoryLog title="Cooling History" events={coolingEvents} empty="No cooling or pause events on record." />
          <HistoryLog title="Registration History" events={registrationEvents} empty="No registration changes on record." />
        </div>

        <div className="card">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">All Events</h3>
          <HistoryLog title={null} events={did.events} empty="No events logged yet." />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent, valueStyle }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className={`text-sm font-semibold ${accent ?? "text-[var(--color-text-primary)]"}`} style={valueStyle}>
        {value}
      </dd>
    </div>
  );
}

function HistoryLog({ title, events, empty }) {
  return (
    <div className={title ? "card" : ""}>
      {title && <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">{title}</h3>}
      {events.length === 0 ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">{empty}</p>
      ) : (
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {events.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm">
              <div>
                <p className="font-medium capitalize text-[var(--color-text-primary)]">{e.type.replaceAll("_", " ")}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{e.detail}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs text-[var(--color-text-tertiary)]">{new Date(e.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreSparkline({ history, color }) {
  if (!history || history.length === 0) return <p className="text-sm text-[var(--color-text-tertiary)]">Not enough history yet.</p>;
  const width = 400;
  const height = 120;
  const padding = 8;
  const scores = history.map((h) => h.score);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const points = history.map((h, i) => {
    const x = padding + (i / Math.max(1, history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((h.score - min) / Math.max(1, max - min)) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {history.map((h, i) => {
        const [x, y] = points[i].split(",").map(Number);
        return <circle key={h.timestamp} cx={x} cy={y} r={2.5} fill={color} />;
      })}
    </svg>
  );
}
