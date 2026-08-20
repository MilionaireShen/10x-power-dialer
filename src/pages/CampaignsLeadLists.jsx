import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import leadService from "../services/leadService";
import campaignService from "../services/campaignService";

const HEALTH_COLOR = {
  fresh: "var(--color-success)",
  tired: "var(--color-warning)",
  exhausted: "var(--color-danger)",
  recycled: "var(--color-info)",
};

export default function CampaignsLeadLists() {
  const [lists, setLists] = useState([]);
  const [campaignsById, setCampaignsById] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([leadService.listLists(), campaignService.list()])
      .then(([listsRes, campaignsRes]) => {
        if (cancelled) return;
        setLists(listsRes.data || []);
        setCampaignsById(Object.fromEntries((campaignsRes.data || []).map((c) => [c.id, c.name])));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <ScreenHeader category="Campaigns" title="Lead Lists" />
      <div className="p-8">
        {loaded && lists.length === 0 ? (
          <div className="card text-sm text-[var(--color-text-tertiary)]">No lead lists yet — upload one from Leads → Upload Leads.</div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">List Name</th>
                  <th className="px-5 py-3 font-medium">Total Leads</th>
                  <th className="px-5 py-3 font-medium">Health</th>
                  <th className="px-5 py-3 font-medium">Times Cycled Through</th>
                  <th className="px-5 py-3 font-medium">Contact Rate</th>
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Next Available</th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l, i) => (
                  <tr key={l.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{l.name}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">
                      {l.leads_remaining.toLocaleString()} / {l.total_leads.toLocaleString()} remaining
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="pill capitalize"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${HEALTH_COLOR[l.health_status] ?? "var(--color-text-tertiary)"} 14%, white)`,
                          color: HEALTH_COLOR[l.health_status] ?? "var(--color-text-tertiary)",
                        }}
                      >
                        {l.health_status ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.times_cycled_through}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.contact_rate}%</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{campaignsById[l.campaign_id] || "Unassigned"}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">
                      {l.is_resting && l.next_available_at ? new Date(l.next_available_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
