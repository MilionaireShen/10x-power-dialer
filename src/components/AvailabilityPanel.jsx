import { CalendarDays, Eye, AlertTriangle, Clock } from "lucide-react";
import SidePanel from "./SidePanel";
import { getClientAvailability } from "../lib/calendarAvailability";
import { isValidCalendarUrl } from "../data/catalogues";

// Read-only availability viewer. There is no click handler anywhere in this
// component that creates, holds, or modifies a calendar event — it only
// ever renders text. Booking happens on the client's side, after the lead
// is qualified.
export default function AvailabilityPanel({ open, onClose, client, campaignName }) {
  const noCalendar = !client || !client.calendarEnabled || !client.calendarUrl;
  const brokenCalendar = client?.calendarEnabled && client?.calendarUrl && !isValidCalendarUrl(client.calendarUrl);
  const days = !noCalendar && !brokenCalendar ? getClientAvailability(client.id) : [];

  return (
    <SidePanel open={open} onClose={onClose} title="Availability" subtitle={campaignName ? `For ${campaignName}` : undefined}>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/25 bg-[var(--color-accent-tint)] px-3 py-2.5 text-xs text-[var(--color-accent)]">
        <Eye size={14} className="shrink-0" />
        View only — share these times with the lead. Appointments are booked by {client?.name ?? "the client"} after qualification.
      </div>

      {noCalendar && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg)] px-6 py-12 text-center">
          <CalendarDays size={26} className="text-[var(--color-text-tertiary)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">No calendar availability configured for this client.</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Let the admin know so they can add one under Clients.</p>
        </div>
      )}

      {brokenCalendar && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger-tint)] px-6 py-12 text-center">
          <AlertTriangle size={26} className="text-[var(--color-danger)]" />
          <p className="text-sm font-medium text-[var(--color-danger)]">Calendar availability is temporarily unavailable.</p>
        </div>
      )}

      {!noCalendar && !brokenCalendar && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{client.name}</p>
            <span className="pill border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[10px] text-[var(--color-text-tertiary)]">
              {client.calendarProvider}
            </span>
          </div>

          {days.map((day) => (
            <div key={day.dateKey}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">{day.label}</p>
              <div className="flex flex-wrap gap-2">
                {day.slots.map((slot) => (
                  <span
                    key={slot}
                    className="pill border border-[var(--color-success)]/25 bg-[var(--color-success-tint)] text-[var(--color-success)]"
                  >
                    <Clock size={11} /> {slot} — Available
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SidePanel>
  );
}
