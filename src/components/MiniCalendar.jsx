import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Lightweight month-grid date picker — no external dependency needed for a
// single calendar-day selector.
export default function MiniCalendar({ value, onChange, minDate }) {
  const [viewDate, setViewDate] = useState(value ?? new Date());
  const today = new Date();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const changeMonth = (delta) => setViewDate(new Date(year, month + delta, 1));

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => changeMonth(-1)} className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)]">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button type="button" onClick={() => changeMonth(1)} className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)]">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--color-text-tertiary)]">
        {DAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={i} />;
          const isPast = minDate && date < minDate;
          const isSelected = value && sameDay(date, value);
          const isToday = sameDay(date, today);
          return (
            <button
              key={i}
              type="button"
              disabled={isPast}
              onClick={() => onChange(date)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              style={{
                backgroundColor: isSelected ? "var(--color-accent)" : "transparent",
                color: isSelected ? "white" : "var(--color-text-primary)",
                fontWeight: isToday && !isSelected ? 700 : 400,
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
