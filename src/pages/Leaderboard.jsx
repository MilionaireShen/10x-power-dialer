import { useState } from "react";
import { Crown, Medal, Flame } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Avatar from "../components/Avatar";
import { LEADERBOARD, CAMPAIGNS } from "../data/mockData";

const PERIODS = ["Today", "This Week", "This Month"];

export default function Leaderboard() {
  const [period, setPeriod] = useState("Today");
  const [campaign, setCampaign] = useState("All Campaigns");

  const top3 = LEADERBOARD.slice(0, 3);
  const rest = LEADERBOARD.slice(3);

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        subtitle="Real-time ranking across every agent"
        actions={
          <>
            <div className="flex overflow-hidden rounded-full border border-[var(--color-border-strong)]">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    period === p ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <select
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              className="input-field w-auto"
            >
              <option>All Campaigns</option>
              {CAMPAIGNS.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          <PodiumCard agent={top3[1]} place={2} />
          <PodiumCard agent={top3[0]} place={1} featured />
          <PodiumCard agent={top3[2]} place={3} />
        </div>

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Calls</th>
                <th className="px-5 py-3 font-medium">Connects</th>
                <th className="px-5 py-3 font-medium">Booked</th>
                <th className="px-5 py-3 font-medium">Conversion</th>
                <th className="px-5 py-3 font-medium">Best Streak</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((a, i) => (
                <tr key={a.rank} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[var(--color-text-tertiary)]">#{a.rank}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name} size={30} />
                      <span className="font-medium text-[var(--color-text-primary)]">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{a.calls}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{a.connects}</td>
                  <td className="px-5 py-3.5 font-semibold text-[var(--color-success)]">{a.appointments}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{a.conversionRate}%</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">
                    <span className="inline-flex items-center gap-1">
                      <Flame size={13} className="text-[var(--color-warning)]" /> {a.bestStreak}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  return (
    <div
      className={`card flex flex-col items-center text-center transition-transform duration-300 ${
        featured ? "order-first md:order-none py-8 scale-105 shadow-md" : "py-6"
      }`}
      style={{ borderColor: `${style.ring}40` }}
    >
      <Icon size={26} style={{ color: style.ring }} />
      <Avatar name={agent.name} size={featured ? 68 : 52} color={style.ring} />
      <p className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">{agent.name}</p>
      <p className="text-xs text-[var(--color-text-tertiary)]">{style.label} Place</p>
      <div className="mt-4 grid w-full grid-cols-2 gap-2 text-center">
        <MiniStat label="Booked" value={agent.appointments} accent="text-[var(--color-success)]" />
        <MiniStat label="Calls" value={agent.calls} />
        <MiniStat label="Connects" value={agent.connects} />
        <MiniStat label="Conv." value={`${agent.conversionRate}%`} accent="text-[var(--color-accent)]" />
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
