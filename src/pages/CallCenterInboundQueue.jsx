import { PhoneIncoming } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";

const WAITING_CALLS = [
  { id: "wc-1", phone: "(818) 555-0142", campaign: "Solar Homeowner Outreach", waitSeconds: 38 },
  { id: "wc-2", phone: "(210) 555-0197", campaign: "Medicare Enrollment Blitz", waitSeconds: 112 },
  { id: "wc-3", phone: "(407) 555-0163", campaign: "Q3 Insurance Renewals", waitSeconds: 19 },
];

function formatWait(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallCenterInboundQueue() {
  return (
    <div>
      <ScreenHeader
        category="Call Center"
        title="Inbound Queue"
        actions={<span className="pill bg-[var(--color-warning-tint)] text-[var(--color-warning)]">{WAITING_CALLS.length} calls waiting</span>}
      />
      <div className="p-8">
        <div className="card divide-y divide-[var(--color-border)] p-0">
          {WAITING_CALLS.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-tint)] text-[var(--color-warning)]">
                <PhoneIncoming size={16} />
              </span>
              <div className="min-w-[160px]">
                <p className="font-medium text-[var(--color-text-primary)]">{c.phone}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{c.campaign}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-mono text-sm font-medium text-[var(--color-text-primary)]">{formatWait(c.waitSeconds)}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">waiting</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
