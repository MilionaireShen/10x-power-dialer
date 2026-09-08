import { useCallback, useEffect, useMemo, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import AgentMonitorTable from "../components/AgentMonitorTable";
import { useAgentActions } from "../lib/useAgentActions";
import agentService from "../services/agentService";
import adminService from "../services/adminService";

const REFRESH_MS = { stop: null, slow: 5000, fast: 1000 };

// Normalizes GET /agent/sessions/active rows into the shape the table
// renders — defensive about exact field naming since the endpoint isn't
// live yet, but keeps everything on real fields only (no fallback to
// fabricated names/numbers).
function normalizeSession(row) {
  const statusSinceMs = row.status_since
    ? new Date(row.status_since).getTime()
    : row.time_in_status_seconds != null
      ? Date.now() - row.time_in_status_seconds * 1000
      : Date.now();
  return {
    id: row.id ?? row.session_id ?? row.agent_id,
    name: row.agent_name ?? row.name ?? "Unknown Agent",
    status: row.status ?? "unknown",
    campaign: row.campaign_name ?? row.campaign ?? "",
    statusSince: statusSinceMs,
    callsToday: row.calls_today ?? row.callsToday ?? 0,
  };
}

export default function CallCenterAgentMonitor() {
  const { handleMonitor, handleAgentAction, panels } = useAgentActions();
  const [agents, setAgents] = useState([]);
  // Read from agent_sessions: who logged out, when, and why. This was a seeded
  // array in React state, so it showed the same four invented rows to everyone
  // and never reflected a real sign-out.
  const [agentLogoutLog, setAgentLogoutLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshRate, setRefreshRate] = useState("slow");

  const loadAgents = useCallback(() => {
    agentService
      .getActiveSessions()
      .then((res) => setAgents((res.data || []).map(normalizeSession)))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAgents();
    adminService
      .agentLogouts({ limit: 50 })
      .then((res) =>
        setAgentLogoutLog(
          (res?.data?.logouts || []).map((l) => ({
            id: l.id,
            agentName: l.agent_name,
            reason: l.reason,
            timestamp: new Date(l.session_end).getTime(),
          }))
        )
      )
      .catch(() => setAgentLogoutLog([]));
  }, [loadAgents]);

  useEffect(() => {
    const ms = REFRESH_MS[refreshRate];
    if (!ms) return;
    const id = setInterval(loadAgents, ms);
    return () => clearInterval(id);
  }, [refreshRate, loadAgents]);

  const campaignNames = useMemo(
    () => Array.from(new Set(agents.map((a) => a.campaign).filter(Boolean))).sort(),
    [agents]
  );

  return (
    <div>
      <ScreenHeader category="Call Center" title="Agent Monitor" />
      <div className="p-8">
        <AgentMonitorTable
          agents={agents}
          loading={loading}
          campaigns={campaignNames}
          agentLogoutLog={agentLogoutLog}
          refreshRate={refreshRate}
          setRefreshRate={setRefreshRate}
          onMonitor={handleMonitor}
          onAction={handleAgentAction}
        />
      </div>
      {panels}
    </div>
  );
}
