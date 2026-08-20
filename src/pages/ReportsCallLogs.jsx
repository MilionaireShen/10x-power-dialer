import { useState } from "react";
import { Play, Phone } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import ExportActions from "../components/ExportActions";
import { RECENT_CALLS, AGENTS, CAMPAIGNS } from "../data/mockData";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function ReportsCallLogs() {
  const { notify } = useToast();
  const { manualDialLog } = useAppData();
  const [agentFilter, setAgentFilter] = useState("All Agents");
  const [campaignFilter, setCampaignFilter] = useState("All Campaigns");

  // Live manually-dialed calls surface alongside the static call history,
  // tagged so admins can tell them apart from predictive-dialer calls.
  const allCalls = [
    ...manualDialLog.map((m) => ({
      id: m.id,
      time: new Date(m.loggedAt).toLocaleString(),
      agent: m.agentName,
      lead: m.leadName,
      phone: m.phone,
      duration: m.duration,
      disposition: m.disposition,
      dispositionColor: m.dispositionColor,
      campaign: m.campaign,
      tag: m.tag,
    })),
    ...RECENT_CALLS,
  ];

  const rows = allCalls.filter(
    (c) => (agentFilter === "All Agents" || c.agent === agentFilter) && (campaignFilter === "All Campaigns" || c.campaign === campaignFilter)
  );

  return (
    <div>
      <ScreenHeader category="Reports" title="Call Logs" actions={<ExportActions />} />
      <div className="p-8 space-y-4">
        <div className="card flex flex-wrap items-end gap-4">
          <Field label="Agent">
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="input-field">
              <option>All Agents</option>
              {AGENTS.map((a) => (
                <option key={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Campaign">
            <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="input-field">
              <option>All Campaigns</option>
              {CAMPAIGNS.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Call Time</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Disposition</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Recording</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-[var(--color-text-tertiary)]">
                    No calls match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((c, i) => (
                  <tr key={c.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.time}</td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{c.agent}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.lead}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{c.phone}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.duration}</td>
                    <td className="px-5 py-3.5">
                      <span className="pill" style={{ backgroundColor: `color-mix(in srgb, ${c.dispositionColor} 14%, white)`, color: c.dispositionColor }}>
                        {c.disposition}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.tag ? (
                        <span className="pill border border-[#0F766E]/25 bg-[#0F766E]/10 text-[#0F766E]">
                          <Phone size={11} className="mr-1 inline" /> {c.tag}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)]">Automated</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => notify(`Playing recording for call with ${c.lead}.`, "info")}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-tint)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        <Play size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}
