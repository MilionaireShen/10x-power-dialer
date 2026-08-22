import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Ban, AlertTriangle, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { useToast } from "../lib/ToastContext";
import smsService from "../services/smsService";

// A conversation thread: the customer's messages and ours, in the order they
// happened, with the confirmation outcome shown against the message that
// produced it.

const STATUS_LABEL = {
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  delivery_unconfirmed: "Delivery unconfirmed",
  failed: "Failed",
  received: "Received",
};

const CONFIRMATION_LABEL = {
  sms_not_sent: "SMS not sent",
  sms_sent: "SMS sent",
  sms_delivered: "SMS delivered",
  awaiting_response: "Awaiting response",
  customer_confirmed: "Customer confirmed",
  customer_declined: "Customer declined",
  customer_requested_change: "Customer requested change",
  customer_question: "Customer question",
  sms_failed: "SMS failed",
  customer_opted_out: "Customer opted out",
};

const CONFIRMATION_TONE = {
  customer_confirmed: "success",
  customer_declined: "danger",
  sms_failed: "danger",
  customer_opted_out: "danger",
  customer_requested_change: "warning",
  customer_question: "warning",
};

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function ConfirmationPill({ status }) {
  if (!status) return null;
  const tone = CONFIRMATION_TONE[status] || "info";
  const colors = {
    success: ["var(--color-success-tint)", "var(--color-success)"],
    danger: ["var(--color-danger-tint)", "var(--color-danger)"],
    warning: ["var(--color-warning-tint)", "var(--color-warning)"],
    info: ["var(--color-info-tint)", "var(--color-info)"],
  }[tone];
  return (
    <span className="pill whitespace-nowrap" style={{ backgroundColor: colors[0], color: colors[1] }}>
      {CONFIRMATION_LABEL[status] || status}
    </span>
  );
}

export default function SmsConversation({ conversationId, canSend = true, onChanged }) {
  const { notify } = useToast();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const cursorRef = useRef(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await smsService.getConversation(conversationId);
      setState(res?.data || null);
      cursorRef.current = new Date().toISOString();
      // Opening the thread is what marks it read, matching what the agent
      // has actually now seen.
      await smsService.markRead(conversationId).catch(() => {});
      onChanged?.();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not open this conversation.", "error");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId, notify, onChanged]);

  useEffect(() => { load(); }, [load]);

  // Polls only for what has changed since the last check, so a reply appears
  // without the agent refreshing and without re-fetching the whole thread.
  useEffect(() => {
    if (!conversationId) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await smsService.changes({
          since: cursorRef.current || new Date(Date.now() - 30000).toISOString(),
          conversation_id: conversationId,
        });
        const fresh = res?.data?.messages || [];
        cursorRef.current = res?.data?.server_time || cursorRef.current;
        if (!fresh.length) return;

        setState((prev) => {
          if (!prev) return prev;
          const seen = new Set(prev.messages.map((m) => m.id));
          const added = fresh.filter((m) => !seen.has(m.id));
          if (!added.length) return prev;
          return { ...prev, messages: [...prev.messages, ...added] };
        });
        await smsService.markRead(conversationId).catch(() => {});
        onChanged?.();
      } catch {
        // A failed poll is not worth interrupting the agent over; the next
        // one will pick the message up.
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [conversationId, onChanged]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state?.messages?.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await smsService.send({ conversation_id: conversationId, body: text });
      setDraft("");
      setState((prev) => prev ? { ...prev, messages: [...prev.messages, res.data.message] } : prev);
      onChanged?.();
    } catch (err) {
      notify(err?.response?.data?.message || "The message could not be sent.", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="p-6 text-sm text-[var(--color-text-tertiary)]">Loading conversation…</p>;
  if (!state) return <p className="p-6 text-sm text-[var(--color-text-tertiary)]">Conversation unavailable.</p>;

  const { conversation, messages, opted_out: optedOut, appointments = [] } = state;
  const apptById = Object.fromEntries(appointments.map((a) => [a.id, a]));
  const leadName = [conversation.lead?.first_name, conversation.lead?.last_name].filter(Boolean).join(" ");
  const replyDisabled = !canSend || optedOut || conversation.campaign?.sms_enabled === false;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[var(--color-text-primary)]">{leadName || "Unknown contact"}</p>
          <span className="font-mono text-xs text-[var(--color-text-tertiary)]">{conversation.contact_number}</span>
          {optedOut && (
            <span className="pill inline-flex items-center gap-1" style={{ backgroundColor: "var(--color-danger-tint)", color: "var(--color-danger)" }}>
              <Ban size={11} /> SMS Opted Out
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
          {conversation.campaign?.name || "No campaign"} · via {conversation.did_number}
          {conversation.agent && ` · ${conversation.agent.first_name} ${conversation.agent.last_name}`}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">No messages in this conversation yet.</p>
        )}
        {messages.map((m) => {
          const outbound = m.direction === "outbound";
          const appt = m.appointment_id ? apptById[m.appointment_id] : null;
          return (
            <div key={m.id}>
              <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                      outbound
                        ? "bg-[var(--color-accent)] text-white"
                        : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    {m.message_body}
                  </div>
                  <div className={`mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] ${outbound ? "justify-end" : ""}`}>
                    <span>{formatTime(m.created_at)}</span>
                    {outbound && (
                      <>
                        <span>·</span>
                        <span className={m.status === "failed" ? "text-[var(--color-danger)]" : ""}>
                          {STATUS_LABEL[m.status] || m.status}
                        </span>
                      </>
                    )}
                  </div>
                  {/* Failure detail belongs next to the message, where the
                      person deciding whether to call the customer will see it. */}
                  {m.status === "failed" && m.failed_reason && (
                    <p className={`mt-1 flex items-start gap-1 text-[11px] text-[var(--color-danger)] ${outbound ? "justify-end text-right" : ""}`}>
                      <AlertTriangle size={11} className="mt-px shrink-0" />
                      {m.error_code ? `${m.error_code}: ` : ""}{m.failed_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* What the system did as a result of this message, shown as its
                  own line so it can never be mistaken for something a person
                  wrote. */}
              {appt && !outbound && appt.confirmation_message_id === m.id && (
                <div className="my-2 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg)] px-3 py-1 text-[11px] text-[var(--color-text-secondary)]">
                    {appt.confirmation_status === "customer_confirmed"
                      ? <CheckCircle2 size={11} className="text-[var(--color-success)]" />
                      : <Clock size={11} className="text-[var(--color-warning)]" />}
                    Appointment marked <ConfirmationPill status={appt.confirmation_status} />
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        {optedOut ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-tint)] px-3 py-2.5 text-xs text-[var(--color-danger)]">
            <Ban size={14} className="shrink-0" />
            This customer has opted out of messages. Replying is blocked until they opt back in themselves.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={2}
              disabled={replyDisabled}
              placeholder={replyDisabled ? "Replying is not enabled for this conversation." : "Type a message… (Enter to send)"}
              className="input-field flex-1 resize-none py-2 text-sm disabled:opacity-60"
            />
            <button onClick={send} disabled={replyDisabled || sending || !draft.trim()} className="btn-purple shrink-0 py-2.5 disabled:opacity-40">
              <Send size={15} /> {sending ? "Sending…" : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConversationPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <MessageSquare size={28} className="text-[var(--color-text-tertiary)]" />
      <p className="text-sm text-[var(--color-text-secondary)]">Select a conversation to read it.</p>
    </div>
  );
}
