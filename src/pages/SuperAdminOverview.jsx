import { useEffect, useState } from "react";
import { Trophy, Building2, PhoneCall } from "lucide-react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import api from "../services/api";

// Every figure here is counted across the real companies on the platform. A
// company with no activity in the window shows zero rather than being left
// out — for a platform operator, "quiet" and "missing" are different problems.

function hours(seconds) {
  if (!seconds) return "0h";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function SuperAdminOverview() {
  const { notify } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/admin/global-overview")
      .then((r) => setData(r.data?.data || null))
      .catch((err) => {
        const message = err?.response?.data?.message || "Could not load the global overview.";
        setError(message);
        notify(message, "error");
      })
      .finally(() => setLoading(false));
  }, [notify]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Global Overview" subtitle="Performance across every company on 10X Power Dialer" />
        <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Global Overview" subtitle="Performance across every company on 10X Power Dialer" />
        <div className="p-8">
          <EmptyState icon={Building2} title="Could not load the overview" description={error || "No data returned."} />
        </div>
      </div>
    );
  }

  const { companies, totals } = data;
  const ranked = [...companies].sort((a, b) => b.calls - a.calls);
  const top = ranked[0];
  const maxCalls = Math.max(...companies.map((c) => c.calls), 1);
  const anyActivity = totals.calls > 0;

  return (
    <div>
      <PageHeader
        title="Global Overview"
        subtitle={`Every company on 10X Power Dialer · ${data.date_from} to ${data.date_to}`}
      />

      <div className="space-y-8 p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <MetricCard label="Companies on Platform" value={totals.companies} />
          <MetricCard label="Companies Active" value={totals.companies_active} accent="text-[var(--color-info)]" />
          <MetricCard label="Agents Online Now" value={totals.agents_online} accent="text-[var(--color-info)]" />
          <MetricCard label="Calls in Period" value={totals.calls.toLocaleString()} />
          <MetricCard label="Appointments Booked" value={totals.appointments} accent="text-[var(--color-success)]" />
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
              Company Performance — Calls in Period
            </h2>
            {companies.length === 0 ? (
              <EmptyState icon={Building2} title="No companies yet" description="Companies appear here once they are created." />
            ) : (
              <div className="space-y-3">
                {ranked.map((c) => (
                  <div key={c.company_id} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm text-[var(--color-text-secondary)]">{c.name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-700"
                        style={{ width: `${(c.calls / maxCalls) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-sm text-[var(--color-text-tertiary)]">
                      {c.calls.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card flex flex-col items-center justify-center text-center">
            {/* Only named when somebody actually placed a call. Crowning a
                "top performer" out of a field of zeros would be meaningless. */}
            {anyActivity && top ? (
              <>
                <Trophy size={26} className="text-[var(--color-gold)]" />
                <p className="mt-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Most Active Company</p>
                <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{top.name}</p>
                <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
                  {top.calls.toLocaleString()} calls · {hours(top.talk_seconds)} talk time
                </p>
                <span className="pill mt-3 border border-[var(--color-gold)]/30 bg-[var(--color-gold-tint)] text-[var(--color-gold)]">
                  {data.date_from} – {data.date_to}
                </span>
              </>
            ) : (
              <>
                <PhoneCall size={26} className="text-[var(--color-text-tertiary)]" />
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No calls in this period</p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  There is nothing to rank until calls are placed.
                </p>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Per-Company Breakdown</h2>
          <div className="card overflow-x-auto p-0">
            {companies.length === 0 ? (
              <div className="p-8">
                <EmptyState icon={Building2} title="No companies yet" description="Nothing to break down." />
              </div>
            ) : (
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Users</th>
                    <th className="px-5 py-3 font-medium">Agents Online</th>
                    <th className="px-5 py-3 font-medium">Calls</th>
                    <th className="px-5 py-3 font-medium">Answered</th>
                    <th className="px-5 py-3 font-medium">Talk Time</th>
                    <th className="px-5 py-3 font-medium">Appointments</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((c, i) => (
                    <tr key={c.company_id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{c.name}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.users}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.agents_online}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.calls.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.answered.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{hours(c.talk_seconds)}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.appointments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
