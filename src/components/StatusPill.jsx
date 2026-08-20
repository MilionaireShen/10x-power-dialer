import { useEffect, useState } from "react";
import { getStatusVisual, secondsSince, formatHMS } from "../lib/statusColors";

// Live-updating status pill: color darkens/changes automatically as time in
// status accrues, per the agent status color system.
export default function StatusPill({ status, since, showTimer = false, size = "md" }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!since) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [since]);

  const elapsed = since ? secondsSince(since) : 0;
  const { color, label } = getStatusVisual(status, elapsed);
  const padding = size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`pill ${padding} border`}
      style={{
        backgroundColor: `${color}22`,
        borderColor: `${color}66`,
        color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
      {showTimer && since && <span className="font-normal opacity-70">· {formatHMS(elapsed)}</span>}
    </span>
  );
}
