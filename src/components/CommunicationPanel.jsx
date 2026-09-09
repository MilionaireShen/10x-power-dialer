import { Mail, MessageSquareText, AlertTriangle } from "lucide-react";

// The agent's always-available communication area. It is a permanent part
// of the workspace: it shows the moment a lead is loaded and a channel is
// enabled for the campaign — NOT when a call connects. It only launches
// the existing SMS / Email composers (SmsForm, EmailComposer) with the
// current lead already bound; it does not send anything itself and holds
// no draft state of its own, so moving to the next lead cannot carry a
// recipient over.
//
// Visibility is driven by:  lead?.id  +  campaign.{sms,email}_enabled
// and nothing about call state.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CommunicationPanel({ campaign, lead, activeCallId, onOpenSms, onOpenEmail }) {
  const emailEnabled = Boolean(campaign?.email_enabled);
  const smsEnabled = Boolean(campaign?.sms_enabled);

  // Nothing to offer: no lead loaded, or the campaign has neither channel.
  if (!lead?.id || (!emailEnabled && !smsEnabled)) return null;

  const email = (lead.email || "").trim();
  const phone = (lead.phone || "").trim();
  const hasEmail = EMAIL_RE.test(email);
  const hasPhone = phone.replace(/[^\d]/g, "").length >= 7;
  const firstName = (lead.fullName || "").trim().split(/\s+/)[0] || "this lead";

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Communication
        </h3>
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          {activeCallId ? "Call in progress" : "No call required"}
        </span>
      </div>

      <div className="mb-3 rounded-lg bg-[var(--color-bg)] px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Current contact</p>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{lead.fullName || "Unknown contact"}</p>
      </div>

      <div className="space-y-2">
        {emailEnabled && (
          <ChannelRow
            icon={Mail}
            label="Email"
            recipient={hasEmail ? email : null}
            missing={`No email address on file for ${firstName}`}
            actionLabel="Compose Email"
            onCompose={onOpenEmail}
          />
        )}
        {smsEnabled && (
          <ChannelRow
            icon={MessageSquareText}
            label="SMS"
            recipient={hasPhone ? phone : null}
            missing={`No phone number on file for ${firstName}`}
            actionLabel="Compose SMS"
            onCompose={onOpenSms}
          />
        )}
      </div>

      <p className="mt-2.5 text-[11px] text-[var(--color-text-tertiary)]">
        Campaign templates open pre-filled with {firstName}&rsquo;s details — review before sending.
      </p>
    </div>
  );
}

function ChannelRow({ icon: Icon, label, recipient, missing, actionLabel, onCompose }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2">
      <Icon size={16} className="shrink-0 text-[var(--color-accent)]" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
        {recipient ? (
          <p className="truncate text-sm text-[var(--color-text-primary)]">{recipient}</p>
        ) : (
          <p className="flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
            <AlertTriangle size={11} className="shrink-0" /> {missing}
          </p>
        )}
      </div>
      <button
        onClick={onCompose}
        disabled={!recipient}
        className="btn-outline shrink-0 py-1.5 text-xs disabled:opacity-40"
      >
        {actionLabel}
      </button>
    </div>
  );
}
