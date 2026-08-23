import { useCallback, useEffect, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import reportService from "../services/reportService";
import campaignService from "../services/campaignService";

// Date ranges the API understands, rather than labels the browser has to
// interpret. The server does the counting either way.
const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

function rangeFor(period) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const start = new Date(now);
  if (period === "week") start.setDate(now.getDate() - 6);
  if (period === "month") start.setDate(now.getDate() - 29);
  return { date_from: start.toISOString().slice(0, 10), date_to: to };
}

export default function Leaderboard() {
  const { notify } = useToast();
  const [period, setPeriod] = useState("today");
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    campaignService.list()
      .then((res) => setCampaigns(res?.data || []))
      .catch(() => { /* the board works without the filter */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...rangeFor(period) };
      if (campaignId) params.campaign_id = campaignId;
      const res = await reportService.leaderboard(params);
      setRows(res?.data || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load the leaderboard.";
      setError(message);
      notify(message, "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [period, campaignId, notify]);

  useEffect(() => { load(); }, [load]);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        subtitle="Ranked on calls actually placed and appointments actually booked"
        actions={
          <>
            <div className="flex overflow-hidden rounded-full border border-[var(--color-border-strong)]">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    period === p.key ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field w-auto">
              <option value="">All Campaigns</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        }
      />

      <div className="space-y-8 p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : error ? (
          <EmptyState icon={Trophy} title="Could not load the leaderboard" description={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No calls in this period"
            description="There is nothing to rank until agents start dialling. Try a wider period."
          />
        ) : (
          <>
            {/* The podium only appears once there is a field to rank. Showing
                empty plinths would imply agents who scored nothing. */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                <PodiumCard agent={top3[1]} place={2} />
                <PodiumCard agent={top3[0]} place={1} featured />
                <PodiumCard agent={top3[2]} place={3} />
              </div>
            )}

            {rest.length > 0 && (
              <div className="card overflow-x-auto p-0">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                      <th className="px-5 py-3 font-medium">Rank</th>
                      <th className="px-5 py-3 font-medium">Agent</th>
                      <th className="px-5 py-3 font-medium">Calls</th>
                      <th className="px-5 py-3 font-medium">Booked</th>
                      <th className="px-5 py-3 font-medium">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((a, i) => (
                      <tr key={a.agent_id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                        <td className="px-5 py-3.5 text-sm font-semibold text-[var(--color-text-tertiary)]">#{a.rank}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={a.agent_name} size={30} />
                            <span className="font-medium text-[var(--color-text-primary)]">{a.agent_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{a.calls}</td>
                        <td className="px-5 py-3.5 font-semibold text-[var(--color-success)]">{a.booked}</td>
                        <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">
                          {a.calls ? `${((a.booked / a.calls) * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const PLACE_STYLE = {
  1: { Icon: Crown, ring: "#B45309", label: "1st" },
  2: { Icon: Medal, ring: "#64748B", label: "2nd" },
  3: { Icon: Medal, ring: "#9A6A3A", label: "3rd" },
};

function PodiumCard({ agent, place, featured }) {
  if (!agent) return <div />;
  const style = PLACE_STYLE[place];
  const Icon = style.Icon;
  const conversion = agent.calls ? ((agent.booked / agent.calls) * 100).toFixed(1) : "0.0";
  return (
    <div
      className={`card flex flex-col items-center text-center transition-transform duration-300 ${
        featured ? "order-first scale-105 py-8 shadow-md md:order-none" : "py-6"
      }`}
      style={{ borderColor: `${style.ring}40` }}
    >
      <Icon size={26} style={{ color: style.ring }} />
      <Avatar name={agent.agent_name} size={featured ? 68 : 52} color={style.ring} />
      <p className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">{agent.agent_name}</p>
      <p className="text-xs text-[var(--color-text-tertiary)]">{style.label} Place</p>
      <div className="mt-4 grid w-full grid-cols-2 gap-2 text-center">
        <MiniStat label="Booked" value={agent.booked} accent="text-[var(--color-success)]" />
        <MiniStat label="Calls" value={agent.calls} />
        <MiniStat label="Conv." value={`${conversion}%`} accent="text-[var(--color-accent)]" />
        <MiniStat label="Rank" value={`#${agent.rank}`} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent = "text-[var(--color-text-primary)]" }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg)] px-2 py-2">
      <p className={`text-base font-semibold ${accent}`}>{value}</p>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}
