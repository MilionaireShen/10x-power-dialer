// Hand-rolled SVG ring gauge — no charting library, consistent with the rest
// of the app's approach to data visuals (plain divs/SVG only).
export default function ScoreGauge({ score, color, size = 160 }) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-bg)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="rotate-90"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fill: "var(--color-text-primary)", fontSize: size * 0.24, fontWeight: 700 }}
      >
        {score}
      </text>
    </svg>
  );
}
