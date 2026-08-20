import { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import ExportActions from "../components/ExportActions";
import campaignService from "../services/campaignService";

const STATUS_COLOR = {
  active: "var(--color-success)",
  paused: "var(--color-warning)",
  completed: "var(--color-text-tertiary)",
  draft: "var(--color-text-tertiary)",
};

export default function ReportsCampaignReports() {
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    campaignService
      .list()
      .then((res) => {
        if (!cancelled) setCampaigns(res.data || []);
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
      {/* GET /campaigns doesn't support ?format=csv (only the /reports/*
          endpoints do), so this intentionally renders the disabled export
          state rather than downloading a broken "csv" that's really JSON. */}
      <ScreenHeader category="Reports" title="Campaign Reports" actions={<ExportActions />} />
      <div className="p-8">
        {loaded && campaigns.length === 0 ? (
          <div className="card text-sm text-[var(--color-text-tertiary)]">No campaigns yet.</div>
        ) : (
          <div className="card divide-y divide-[var(--color-border)] p-0">
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-[220px]">
                  <p className="font-medium text-[var(--color-text-primary)]">{c.name}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] capitalize">
                    {c.dialing_mode} mode · {c.agent_count} agent{c.agent_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex-1 sm:mx-6">
                  <div className="flex gap-6 text-xs text-[var(--color-text-tertiary)]">
                    <span>
                      <span className="font-medium text-[var(--color-text-primary)]">{c.calls_today}</span> calls today
                    </span>
                    <span>
                      <span className="font-medium text-[var(--color-text-primary)]">{c.leads_remaining}</span> leads remaining
                    </span>
                  </div>
                </div>
                <span
                  className="pill shrink-0 capitalize"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${STATUS_COLOR[c.status] ?? "var(--color-text-tertiary)"} 14%, white)`,
                    color: STATUS_COLOR[c.status] ?? "var(--color-text-tertiary)",
                  }}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
