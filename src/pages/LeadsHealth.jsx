import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import leadService from "../services/leadService";

// Matches lead_lists.health_status, which the dialer maintains from real
// attempt counts rather than anything set by hand.
const HEALTH_COLOR = {
  fresh: "var(--color-success)",
  tired: "var(--color-warning)",
  exhausted: "var(--color-danger)",
  recycled: "var(--color-info)",
};

function healthLabel(status) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function LeadsHealth() {
  const { notify } = useToast();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    leadService.listLists()
      .then((res) => setLists(res?.data || []))
      .catch((err) => {
        const message = err?.response?.data?.message || "Could not load lead lists.";
        setError(message);
        notify(message, "error");
      })
      .finally(() => setLoading(false));
  }, [notify]);

  return (
    <div>
      <ScreenHeader category="Leads" title="Lead List Health" />
      <div className="space-y-6 p-8">
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">How the Health System Works</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HealthExplain color={HEALTH_COLOR.fresh} title="Fresh" subtitle="0–3 attempts" desc="Prime calling window — highest contact rates." />
            <HealthExplain color={HEALTH_COLOR.tired} title="Tired" subtitle="4–6 attempts" desc="Declining returns — add SMS follow-up." />
            <HealthExplain color={HEALTH_COLOR.exhausted} title="Exhausted" subtitle="7+ attempts" desc="Rest now — auto-rests for 30 days." />
            <HealthExplain color={HEALTH_COLOR.recycled} title="Recycled" subtitle="After 30-day rest" desc="Ready for a fresh calling cycle." />
          </div>
        </div>

        <div className="card overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : error ? (
            <div className="p-8"><EmptyState icon={ListChecks} title="Could not load lead lists" description={error} /></div>
          ) : lists.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ListChecks}
                title="No lead lists yet"
                description="Upload a lead list and its health is tracked here as it is called through."
              />
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">List Name</th>
                  <th className="px-5 py-3 font-medium">Health</th>
                  <th className="px-5 py-3 font-medium">Leads</th>
                  <th className="px-5 py-3 font-medium">Called</th>
                  <th className="px-5 py-3 font-medium">Times Called Through</th>
                  <th className="px-5 py-3 font-medium">Contact Rate</th>
                  <th className="px-5 py-3 font-medium">Next Available</th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l, i) => {
                  const color = HEALTH_COLOR[l.health_status] || "var(--color-text-tertiary)";
                  return (
                    <tr key={l.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{l.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="pill" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, white)`, color }}>
                          {healthLabel(l.health_status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.total_leads ?? 0}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.leads_called ?? 0}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.times_cycled_through ?? 0}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">
                        {/* Only shown once the list has actually been called —
                            a contact rate of 0% on an untouched list reads as
                            failure rather than as "not started". */}
                        {l.leads_called ? `${Number(l.contact_rate ?? 0).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">
                        {l.is_resting && l.next_available_at
                          ? new Date(l.next_available_at).toLocaleDateString()
                          : "Available now"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthExplain({ color, title, subtitle, desc }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <span className="pill mb-2" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, white)`, color }}>
        {title}
      </span>
      <p className="text-xs font-medium text-[var(--color-text-secondary)]">{subtitle}</p>
      <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">{desc}</p>
    </div>
  );
}
