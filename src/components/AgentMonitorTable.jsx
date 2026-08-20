import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Headphones, Radio, LogIn, MoreVertical, Phone, Users, X } from "lucide-react";
import Avatar from "./Avatar";
import { secondsSince, formatHMS, getStatusVisual } from "../lib/statusColors";

// Only the statuses GET /agent/sessions/active can actually report — the
// legend and metric blocks below are built from this list rather than the
// larger fake-data status vocabulary the mock AGENTS array used to have
// (dead_call, manual_dial timers, etc. with no real backing).
const STATUS_LEGEND = [
  { key: "available", label: "Available" },
  { key: "on_call", label: "On Call" },
  { key: "dispo", label: "In Dispo / Wrap-Up" },
  { key: "unready", label: "Unready" },
  { key: "lunch", label: "Lunch" },
  { key: "break", label: "Break" },
];

const REFRESH_RATES = [
  { key: "stop", label: "STOP", ms: null },
  { key: "slow", label: "SLOW 5sec", ms: 5000 },
  { key: "fast", label: "FAST 1sec", ms: 1000 },
];

export default function AgentMonitorTable({ agents, loading, campaigns, agentLogoutLog = [], refreshRate, setRefreshRate, onMonitor, onAction }) {
  const [now, setNow] = useState(Date.now());
  const [campaignFilter, setCampaignFilter] = useState("All Campaigns");
  const [search, setSearch] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [detailAgent, setDetailAgent] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return agents
      .filter((a) => campaignFilter === "All Campaigns" || a.campaign === campaignFilter)
      .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  }, [agents, campaignFilter, search]);

  // --- global metrics — all derived from the real sessions list, so an
  // empty list naturally yields all zeros instead of any hardcoded number.
  const metrics = useMemo(() => {
    const total = agents.length;
    const available = agents.filter((a) => a.status === "available").length;
    const inCall = agents.filter((a) => a.status === "on_call").length;
    const inDispo = agents.filter((a) => a.status === "dispo").length;
    const paused = agents.filter((a) => a.status === "unready" || a.status === "lunch" || a.status === "break").length;
    const totalCallsToday = agents.reduce((s, a) => s + (a.callsToday || 0), 0);
    return { total, available, inCall, inDispo, paused, totalCallsToday };
  }, [agents]);

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Agent Monitor</h2>

      <GlobalMetricsBar metrics={metrics} />

      <div className="card mb-3 flex flex-wrap items-center gap-3">
        <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="input-field w-auto">
          <option>All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] p-0.5">
          {REFRESH_RATES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRefreshRate(r.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                refreshRate === r.key ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-3 p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agent by name…"
              className="input-field py-2 pl-9 text-sm"
            />
          </div>
          <span className="text-xs text-[var(--color-text-tertiary)]">{filtered.length} agents</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-4 py-3 font-medium">Agent Name</th>
                <th className="px-4 py-3 font-medium">Listen</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Time in Status</th>
                <th className="px-4 py-3 font-medium">Calls Today</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-tertiary)]">
                    Loading agents…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((agent) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    now={now}
                    logoutEntry={agentLogoutLog.find((l) => l.agentName === agent.name)}
                    onNameClick={() => setDetailAgent(agent)}
                    onMonitor={(type) => onMonitor(agent, type)}
                    menuOpen={menuOpenFor === agent.id}
                    onToggleMenu={() => setMenuOpenFor(menuOpenFor === agent.id ? null : agent.id)}
                    onAction={(action) => {
                      setMenuOpenFor(null);
                      onAction(agent, action);
                    }}
                  />
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--color-text-tertiary)]">
                    {agents.length === 0 ? "No agents currently logged in" : "No agents match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StatusLegend />

      {detailAgent && <AgentDetailPanel agent={detailAgent} onClose={() => setDetailAgent(null)} />}
    </section>
  );
}

function GlobalMetricsBar({ metrics }) {
  const blocks = [
    { label: "Total Agents", value: metrics.total, color: "var(--color-info)" },
    { label: "Available", value: metrics.available, color: "#6B7280" },
    { label: "In Call", value: metrics.inCall, color: "var(--color-success)" },
    { label: "In Dispo", value: metrics.inDispo, color: "var(--color-warning)" },
    { label: "Paused", value: metrics.paused, color: "#EA580C" },
    { label: "Calls Today", value: metrics.totalCallsToday, color: "var(--color-accent)" },
  ];

  return (
    <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {blocks.map((b) => (
        <div
          key={b.label}
          className="rounded-lg border p-3 text-center"
          style={{ borderColor: `color-mix(in srgb, ${b.color} 30%, white)`, backgroundColor: `color-mix(in srgb, ${b.color} 8%, white)` }}
        >
          <p className="text-xl font-bold" style={{ color: b.color }}>
            {b.value}
          </p>
          <p className="text-[10px] leading-tight text-[var(--color-text-secondary)]">{b.label}</p>
        </div>
      ))}
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {STATUS_LEGEND.map((l) => {
        const visual = getStatusVisual(l.key, 0);
        return (
          <span key={l.key} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: visual.color }} />
            {l.label}
          </span>
        );
      })}
    </div>
  );
}

function AgentRow({ agent, now, logoutEntry, onNameClick, onMonitor, menuOpen, onToggleMenu, onAction }) {
  const onCall = agent.status === "on_call";
  const statusSeconds = secondsSince(agent.statusSince);
  const statusVisual = getStatusVisual(agent.status, statusSeconds);
  const showLogoutReason =
    agent.status === "logged_out" && logoutEntry && (logoutEntry.reason === "wrapup_timeout" || logoutEntry.reason === "admin_kick");
  const logoutVisual = showLogoutReason
    ? logoutEntry.reason === "admin_kick"
      ? { color: "#991B1B", label: "Kicked" }
      : { color: "#EF4444", label: "Timed Out" }
    : null;

  return (
    <tr className="border-b border-[var(--color-border)] last:border-0 transition-colors">
      <td className="whitespace-nowrap px-4 py-3">
        <button onClick={onNameClick} className="font-medium text-[var(--color-accent)] hover:underline">
          {agent.name}
        </button>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-1">
          <MonitorIcon icon={Headphones} active={onCall} onClick={() => onMonitor("listen")} label="Listen" />
          <MonitorIcon icon={Radio} active={onCall} onClick={() => onMonitor("whisper")} label="Whisper" />
          <MonitorIcon icon={LogIn} active={onCall} onClick={() => onMonitor("barge")} label="Barge" />
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {logoutVisual ? (
          <span
            className="pill"
            title={`Logged out ${new Date(logoutEntry.timestamp).toLocaleString()}`}
            style={{ backgroundColor: `${logoutVisual.color}18`, color: logoutVisual.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: logoutVisual.color }} />
            {logoutVisual.label}
          </span>
        ) : (
          <span className="pill" style={{ backgroundColor: `${statusVisual.color}18`, color: statusVisual.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusVisual.color }} />
            {statusVisual.label}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-primary)]">{formatHMS(statusSeconds)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-primary)]">{agent.callsToday}</td>
      <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-secondary)]">{agent.campaign || "—"}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="relative inline-block">
          <button
            onClick={onToggleMenu}
            className="rounded-full p-1 text-[var(--color-text-tertiary)] hover:bg-white hover:text-[var(--color-text-primary)] transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
              {[
                "Listen to Call",
                "Whisper to Agent",
                "Barge Into Call",
                "Send Message to Agent",
                "Force Status Change",
                "Force Logout",
                "View Agent's Callback Queue",
              ].map((action) => {
                const requiresCall = action.includes("Listen") || action.includes("Whisper") || action.includes("Barge");
                const disabled = requiresCall && !onCall;
                return (
                  <button
                    key={action}
                    disabled={disabled}
                    onClick={() => !disabled && onAction(action)}
                    className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-35 ${
                      action === "Force Logout" ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"
                    }`}
                  >
                    {action}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function MonitorIcon({ icon: Icon, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      disabled={!active}
      title={active ? label : `${label} (agent not on a call)`}
      className={`rounded-full p-1 transition-colors ${
        active ? "text-[var(--color-accent)] hover:bg-[var(--color-accent-tint)]" : "cursor-not-allowed text-[var(--color-text-tertiary)] opacity-30"
      }`}
    >
      <Icon size={13} />
    </button>
  );
}

function AgentDetailPanel({ agent, onClose }) {
  const statusVisual = getStatusVisual(agent.status, secondsSince(agent.statusSince));
  return createPortal(
    <>
      <div className="side-panel-overlay" onClick={onClose} />
      <div className="side-panel max-w-md">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <Avatar name={agent.name} size={40} />
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{agent.name}</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">{agent.campaign || "No campaign"}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-5 px-6 py-6">
          <span className="pill" style={{ backgroundColor: `${statusVisual.color}18`, color: statusVisual.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusVisual.color }} />
            {statusVisual.label}
          </span>

          <div className="grid grid-cols-2 gap-2.5 text-center">
            <MetricMini icon={Phone} label="Calls Today" value={agent.callsToday} />
            <MetricMini icon={Users} label="Time in Status" value={formatHMS(secondsSince(agent.statusSince))} />
          </div>

          <dl className="space-y-2 rounded-lg bg-[var(--color-bg)] p-3 text-sm">
            <Row label="Campaign" value={agent.campaign || "—"} />
          </dl>
        </div>
      </div>
    </>,
    document.body
  );
}

function MetricMini({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg)] px-2 py-3">
      <Icon size={14} className="mx-auto mb-1 text-[var(--color-text-tertiary)]" />
      <p className="text-base font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="font-medium text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
