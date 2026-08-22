import { Phone, PhoneOff, User, History } from "lucide-react";

// Presented only for a genuine inbound customer call. A leg the platform
// dialed to bridge an outbound call the agent already started is auto-answered
// and never reaches here — prompting for that would be a pointless extra click.
export default function IncomingCallPanel({ call, onAnswer, onDecline }) {
  if (!call) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-accent-tint)]" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
              <Phone size={26} />
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Incoming Call
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
              {call.callerNumber || "Unknown caller"}
            </p>
            {/* Which of our numbers they dialed. With several DIDs serving
                different clients, the agent needs to know who they are
                answering as before they say hello. */}
            {call.didNumber && (
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                DID called: <span className="font-mono">{call.didNumber}</span>
              </p>
            )}
            {call.campaignName && (
              <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{call.campaignName}</p>
            )}
            {/* The caller is genuinely still ringing at this point — the leg
                is not answered until Answer is clicked. */}
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[var(--color-accent)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
              Ringing…
            </p>
          </div>

          {/* Shown so the agent knows this person has spoken to the team
              before, without exposing anything about the prior conversation. */}
          {call.hasPreviousContact && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
              <History size={13} />
              Previous contact — routed back to you where possible
            </div>
          )}

          <div className="mt-2 grid w-full grid-cols-2 gap-3">
            <button onClick={onDecline} className="btn-danger justify-center py-3">
              <PhoneOff size={16} /> Decline
            </button>
            <button onClick={onAnswer} className="btn-purple justify-center py-3">
              <Phone size={16} /> Answer
            </button>
          </div>

          <p className="text-[11px] text-[var(--color-text-tertiary)]">
            <User size={11} className="mr-1 inline" />
            Declining returns this caller to the queue for another agent.
          </p>
        </div>
      </div>
    </div>
  );
}
