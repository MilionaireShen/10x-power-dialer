import ScreenHeader from "../components/ScreenHeader";
import { LEAD_LISTS } from "../data/mockData";

const HEALTH_COLOR = {
  Fresh: "var(--color-success)",
  Tired: "var(--color-warning)",
  Exhausted: "var(--color-danger)",
  Recycled: "var(--color-info)",
};

export default function LeadsHealth() {
  return (
    <div>
      <ScreenHeader category="Leads" title="Lead List Health" />
      <div className="p-8 space-y-6">
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">How the Health System Works</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HealthExplain color={HEALTH_COLOR.Fresh} title="Fresh" subtitle="0–3 attempts" desc="Prime calling window — highest contact rates." />
            <HealthExplain color={HEALTH_COLOR.Tired} title="Tired" subtitle="4–6 attempts" desc="Declining returns — add SMS follow-up." />
            <HealthExplain color={HEALTH_COLOR.Exhausted} title="Exhausted" subtitle="7+ attempts" desc="Rest now — auto-rests for 30 days." />
            <HealthExplain color={HEALTH_COLOR.Recycled} title="Recycled" subtitle="After 30-day rest" desc="Ready for a fresh calling cycle." />
          </div>
        </div>

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">List Name</th>
                <th className="px-5 py-3 font-medium">Health</th>
                <th className="px-5 py-3 font-medium">Times Called Through</th>
                <th className="px-5 py-3 font-medium">Contact Rate</th>
                <th className="px-5 py-3 font-medium">Next Available</th>
              </tr>
            </thead>
            <tbody>
              {LEAD_LISTS.map((l, i) => (
                <tr key={l.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{l.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="pill" style={{ backgroundColor: `color-mix(in srgb, ${HEALTH_COLOR[l.health]} 14%, white)`, color: HEALTH_COLOR[l.health] }}>
                      {l.health}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.timesCalledThrough}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.contactRate}%</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{l.nextAvailable ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
