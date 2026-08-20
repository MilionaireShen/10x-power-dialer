import { Trophy, PhoneOff, Flag, Armchair, PhoneMissed } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { COMPANIES, SUPER_ADMIN_ALERTS, AGENTS } from "../data/mockData";

const GLOBAL = {
  companiesActive: COMPANIES.filter((c) => c.status === "Active").length,
  agentsOnline: AGENTS.filter((a) => a.status !== "logged_out").length,
  callsToday: 8231,
  bookedToday: 312,
  mrr: COMPANIES.reduce((s, c) => s + c.seatsTotal * c.monthlyRate, 0),
};

const topCompany = [...COMPANIES].sort((a, b) => b.callsToday - a.callsToday)[0];
const maxCalls = Math.max(...COMPANIES.map((c) => c.callsToday), 1);

export default function SuperAdminOverview() {
  return (
    <div>
      <PageHeader title="Global Overview" subtitle="Performance across every company on 10X Power Dialer" />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <MetricCard label="Companies Active" value={GLOBAL.companiesActive} />
          <MetricCard label="Agents Online Now" value={GLOBAL.agentsOnline} accent="text-[var(--color-info)]" />
          <MetricCard label="Total Calls Today" value={GLOBAL.callsToday.toLocaleString()} />
          <MetricCard label="Booked Today" value={GLOBAL.bookedToday} accent="text-[var(--color-success)]" />
          <MetricCard label="Monthly Recurring Revenue" value={`$${GLOBAL.mrr.toLocaleString()}`} accent="text-[var(--color-accent)]" />
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
              Company Performance — Calls Today
            </h2>
            <div className="space-y-3">
              {COMPANIES.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm text-[var(--color-text-secondary)]">{c.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-700"
                      style={{ width: `${(c.callsToday / maxCalls) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm text-[var(--color-text-tertiary)]">{c.callsToday.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card flex flex-col items-center justify-center text-center">
            <Trophy size={26} className="text-[var(--color-gold)]" />
            <p className="mt-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Top Performing Company</p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{topCompany.name}</p>
            <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">{topCompany.callsToday.toLocaleString()} calls this week</p>
            <span className="pill mt-3 border border-[var(--color-gold)]/30 bg-[var(--color-gold-tint)] text-[var(--color-gold)]">This Week</span>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Alerts</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AlertCard title="Agents Auto-Logged Out Today" Icon={PhoneOff} color="var(--color-danger)">
              {SUPER_ADMIN_ALERTS.autoLogouts.map((a, i) => (
                <AlertRow key={i} primary={`${a.agent} — ${a.company}`} secondary={`${a.reason} · ${a.time}`} />
              ))}
            </AlertCard>

            <AlertCard title="Phone Numbers Flagged Spam Likely" Icon={Flag} color="var(--color-warning)">
              {SUPER_ADMIN_ALERTS.spamFlags.map((s, i) => (
                <AlertRow key={i} primary={s.number} secondary={s.company} />
              ))}
            </AlertCard>

            <AlertCard title="Companies Approaching Seat Limit" Icon={Armchair} color="var(--color-accent)">
              {SUPER_ADMIN_ALERTS.seatLimits.map((s, i) => (
                <AlertRow key={i} primary={s.company} secondary={`${s.used}/${s.total} seats used`} />
              ))}
            </AlertCard>

            <AlertCard title="Missed Inbound Calls" Icon={PhoneMissed} color="var(--color-info)">
              {SUPER_ADMIN_ALERTS.missedInbound.map((m, i) => (
                <AlertRow key={i} primary={m.company} secondary={`${m.count} missed calls`} />
              ))}
            </AlertCard>
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

function AlertCard({ title, Icon, color, children }) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, white)`, color }}
        >
          <Icon size={16} />
        </span>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function AlertRow({ primary, secondary }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-3 py-2">
      <span className="truncate text-sm text-[var(--color-text-primary)]">{primary}</span>
      <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">{secondary}</span>
    </div>
  );
}
