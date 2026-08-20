import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, BarChart3, FolderKanban, Megaphone, PauseCircle } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../lib/AuthContext";
import campaignService from "../services/campaignService";
import reportService from "../services/reportService";

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

const QUICK_LINKS = [
  { label: "Agent Monitor", path: "/admin/call-center/agent-monitor", icon: Headphones },
  { label: "All Campaigns", path: "/admin/campaigns/all", icon: FolderKanban },
  { label: "Reports", path: "/admin/reports/agent-performance", icon: BarChart3 },
  { label: "Broadcast Message", path: "/admin/call-center/broadcast", icon: Megaphone },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Admin/manager/super_admin get unrestricted visibility from this
  // endpoint (unlike an agent caller), so today's rows cover every agent
  // in the company — that's what these totals are aggregated from.
  const [totals, setTotals] = useState({ calls: 0, connects: 0, booked: 0, activeAgents: 0 });
  const [pausedCampaigns, setPausedCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const todayStr = todayDateStr();
        const [perfRes, campaignsRes] = await Promise.all([
          reportService.agentPerformance({ date_from: todayStr, date_to: todayStr }),
          campaignService.list(),
        ]);
        if (cancelled) return;
        const rows = perfRes.data || [];
        setTotals({
          calls: rows.reduce((s, r) => s + (r.total_calls || 0), 0),
          connects: rows.reduce((s, r) => s + (r.connects || 0), 0),
          booked: rows.reduce((s, r) => s + (r.dispositions_breakdown?.["Booked Appointment"] || 0), 0),
          activeAgents: rows.length,
        });
        setPausedCampaigns((campaignsRes.data || []).filter((c) => c.status === "paused"));
      } catch {
        // leave real zeros/empty state on screen rather than fabricating numbers
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const conversionRate = totals.calls > 0 ? ((totals.booked / totals.calls) * 100).toFixed(1) : "0.0";

  const alerts = [
    pausedCampaigns.length > 0 && {
      icon: PauseCircle,
      text: `${pausedCampaigns.length} campaign${pausedCampaigns.length > 1 ? "s" : ""} currently paused`,
      tone: "warning",
    },
  ].filter(Boolean);

  return (
    <div>
      <ScreenHeader category="Home" title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`} />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <MetricCard label="Total Calls Today" value={loaded ? totals.calls.toLocaleString() : "—"} />
          <MetricCard label="Total Connects" value={loaded ? totals.connects.toLocaleString() : "—"} />
          <MetricCard label="Booked Appointments" value={loaded ? totals.booked : "—"} accent="text-[var(--color-success)]" />
          <MetricCard label="Active Agents" value={loaded ? totals.activeAgents : "—"} accent="text-[var(--color-info)]" />
          <MetricCard label="Conversion Rate" value={loaded ? `${conversionRate}%` : "—"} accent="text-[var(--color-accent)]" />
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Quick Links</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {QUICK_LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <button key={l.label} onClick={() => navigate(l.path)} className="card flex flex-col items-start gap-2.5 text-left transition-shadow hover:shadow-md">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
                    <Icon size={17} />
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{l.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Alerts</h2>
          {alerts.length === 0 ? (
            <div className="card text-sm text-[var(--color-text-tertiary)]">No alerts right now — everything looks healthy.</div>
          ) : (
            <div className="card divide-y divide-[var(--color-border)] p-0">
              {alerts.map((a, i) => {
                const Icon = a.icon;
                const color = a.tone === "danger" ? "var(--color-danger)" : a.tone === "warning" ? "var(--color-warning)" : "var(--color-info)";
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                    <Icon size={16} style={{ color }} />
                    <span className="text-sm text-[var(--color-text-primary)]">{a.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent = "text-[var(--color-text-primary)]" }) {
  return (
    <div className="card">
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}
