import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, AlertTriangle, Eye, Send, Info, CreditCard, ChevronLeft } from "lucide-react";
import { useToast } from "../lib/ToastContext";
import emailService from "../services/emailService";

// The agent's email composer — opens inside the dialer next to the SMS
// panel, already knowing the current lead. It works before a call is
// placed (no callId) exactly as it does mid-call. It never talks to the
// provider: it asks the server to render the chosen template against the
// real lead + the order values below, shows that exact preview, and sends
// the same thing. The preview renders in a sandboxed iframe so template
// HTML can never run script in the dialer.
//
// Two purposes (spec parts 3-5):
//   - "Vacation Information" — enough to make a decision, no payment link.
//   - "Payment Information"  — for a decided customer, MUST carry a valid
//     customer-specific Stripe payment link or the send is blocked.

const ORDER_FIELDS = [
  { key: "package_name", label: "Package name", placeholder: "Cancun All-Inclusive 5-Night" },
  { key: "package_price", label: "Package price", placeholder: "$799" },
  { key: "guest_count", label: "Guests / travelers", placeholder: "2" },
  { key: "destination", label: "Destination", placeholder: "Cancun, Mexico" },
  { key: "travel_date", label: "Travel date", placeholder: "March 14, 2026" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors isValidStripePaymentLink() in the backend (emailSendService.js).
// The backend is authoritative — this only lets the agent see the problem
// before they hit Send.
function isValidStripeLink(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && /(^|\.)stripe\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

const TYPE_META = {
  information: { label: "Vacation Information", icon: Info, blurb: "Package details to help them decide. No payment link." },
  payment: { label: "Payment Information", icon: CreditCard, blurb: "For a customer ready to pay. Needs their Stripe payment link." },
};

export default function EmailComposer({ campaign, lead, callId, onSent, presetType = null }) {
  const { notify } = useToast();
  const [emailType, setEmailType] = useState(presetType);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [order, setOrder] = useState({});
  const [paymentLink, setPaymentLink] = useState(campaign?.email_payment_link || "");
  const [subject, setSubject] = useState("");
  const [rendered, setRendered] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMessageId, setSentMessageId] = useState(null);
  const [sentStatus, setSentStatus] = useState(null);
  const [sentType, setSentType] = useState(null);
  const subjectTouched = useRef(false);

  const leadEmail = (lead?.email || "").trim();
  const hasEmail = EMAIL_RE.test(leadEmail);
  const isPayment = emailType === "payment";
  const paymentLinkOk = !isPayment || isValidStripeLink(paymentLink);

  // Load this campaign's active templates once; the visible list is then
  // narrowed to the chosen purpose, and the campaign's per-purpose template
  // (or its generic default) is preselected.
  useEffect(() => {
    if (!campaign?.id) return;
    emailService
      .listTemplates({ campaign_id: campaign.id, active_only: "true" })
      .then((res) => setTemplates(res?.data?.templates || []))
      .catch(() => setTemplates([]));
  }, [campaign?.id]);

  const templatesForType = useMemo(() => {
    if (!emailType) return templates;
    const wantPayment = emailType === "payment";
    const matches = templates.filter((t) =>
      wantPayment ? t.category === "payment_instructions" : t.category !== "payment_instructions"
    );
    // If nothing is categorised, don't hide everything — show all.
    return matches.length ? matches : templates;
  }, [templates, emailType]);

  // Pick the template when the purpose (or the loaded list) changes.
  useEffect(() => {
    if (!emailType || templates.length === 0) return;
    const preferredId =
      (emailType === "payment"
        ? campaign?.email_payment_template_id
        : campaign?.email_information_template_id) || campaign?.email_default_template_id;
    const preferred = preferredId && templatesForType.find((t) => t.id === preferredId);
    setTemplateId(preferred ? preferred.id : templatesForType[0]?.id || "");
    subjectTouched.current = false;
  }, [emailType, templates, templatesForType, campaign?.email_payment_template_id, campaign?.email_information_template_id, campaign?.email_default_template_id]);

  const orderPayload = useMemo(
    () => ({ ...order, ...(paymentLink.trim() ? { payment_link: paymentLink.trim() } : {}) }),
    [order, paymentLink]
  );

  // Server-rendered preview — the same engine that renders the real send,
  // debounced so typing an amount doesn't hammer the endpoint.
  const runPreview = useCallback(() => {
    if (!templateId || !lead?.id) { setRendered(null); return; }
    setLoadingPreview(true);
    emailService
      .previewTemplate({
        template_id: templateId,
        lead_id: lead.id,
        campaign_id: campaign?.id,
        order: orderPayload,
      })
      .then((res) => {
        const data = res?.data || null;
        setRendered(data);
        if (data && !subjectTouched.current) setSubject(data.subject || "");
      })
      .catch((err) => notify(err?.response?.data?.message || "Could not render the preview.", "error"))
      .finally(() => setLoadingPreview(false));
  }, [templateId, lead?.id, campaign?.id, orderPayload, notify]);

  useEffect(() => {
    const t = setTimeout(runPreview, 350);
    return () => clearTimeout(t);
  }, [runPreview]);

  // Poll the send's real status once it's out (status comes from the
  // backend/webhook, never a client timer).
  useEffect(() => {
    if (!sentMessageId) return;
    let cancelled = false;
    const load = () =>
      emailService.getMessage(sentMessageId).then((res) => {
        if (!cancelled) setSentStatus(res?.data?.message?.status || null);
      }).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [sentMessageId]);

  const send = async () => {
    if (!hasEmail || !paymentLinkOk) return;
    setSending(true);
    try {
      const res = await emailService.send({
        campaign_id: campaign.id,
        lead_id: lead.id,
        call_id: callId || null,
        email_type: emailType,
        template_id: templateId,
        to: leadEmail,
        subject: subjectTouched.current ? subject : undefined,
        order: orderPayload,
      });
      const id = res?.data?.message?.id;
      setSentMessageId(id || null);
      setSentStatus(res?.data?.message?.status || "queued");
      setSentType(emailType);
      notify(`${isPayment ? "Payment" : "Information"} email sent.`, "success");
      onSent?.();
    } catch (err) {
      notify(err?.response?.data?.message || "The email could not be sent.", "error");
    } finally {
      setSending(false);
    }
  };

  if (!hasEmail) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle size={28} className="text-[var(--color-warning)]" />
        <p className="text-sm font-medium text-[var(--color-text-primary)]">No email address is available for this lead.</p>
        <p className="max-w-xs text-xs text-[var(--color-text-tertiary)]">
          Add the customer's email on the lead screen first — an email can't be sent to an empty address.
        </p>
      </div>
    );
  }

  if (sentMessageId) {
    return (
      <div className="space-y-4 py-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Mail size={28} className="text-[var(--color-success)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {sentType === "payment" ? "Payment" : "Information"} email sent to {leadEmail}
          </p>
          <StatusRow status={sentStatus} />
          <p className="text-[11px] text-[var(--color-text-tertiary)]">
            Delivery, opens{sentType === "payment" ? ", and the payment-link click" : " and clicks"} update here from real
            tracking events, and stay on the lead timeline.
          </p>
        </div>
      </div>
    );
  }

  // Step 1 — pick the purpose (spec part 5). Fast: two buttons.
  if (!emailType) {
    return (
      <div className="space-y-3 py-2">
        <p className="text-sm text-[var(--color-text-secondary)]">What kind of email is this?</p>
        {["information", "payment"].map((key) => {
          const { label, icon: Icon, blurb } = TYPE_META[key];
          return (
            <button
              key={key}
              onClick={() => setEmailType(key)}
              className="flex w-full items-start gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4 text-left transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5"
            >
              <Icon size={20} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
              <span>
                <span className="block text-sm font-semibold text-[var(--color-text-primary)]">{label}</span>
                <span className="block text-xs text-[var(--color-text-tertiary)]">{blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!presetType && (
        <button
          onClick={() => setEmailType(null)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          <ChevronLeft size={13} /> Change type
        </button>
      )}

      <div className="flex items-center gap-2 rounded-lg bg-[var(--color-bg)] px-3 py-2">
        {(() => { const Icon = TYPE_META[emailType].icon; return <Icon size={15} className="text-[var(--color-accent)]" />; })()}
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{TYPE_META[emailType].label}</span>
      </div>

      <Field label="To">
        <input value={leadEmail} readOnly className="input-field bg-[var(--color-bg)]" />
      </Field>

      <Field label="From">
        <input
          value={rendered?.sender_label || "Your company's configured sender address"}
          readOnly
          className="input-field bg-[var(--color-bg)] text-xs"
        />
      </Field>

      <Field label="Template">
        <select value={templateId} onChange={(e) => { subjectTouched.current = false; setTemplateId(e.target.value); }} className="input-field">
          {templatesForType.length === 0 && <option value="">No templates assigned to this campaign</option>}
          {templatesForType.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        {ORDER_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              value={order[f.key] || ""}
              onChange={(e) => setOrder((o) => ({ ...o, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="input-field py-1.5 text-sm"
            />
          </Field>
        ))}
      </div>

      {isPayment ? (
        <Field label="Stripe payment link (required)">
          <input
            value={paymentLink}
            onChange={(e) => setPaymentLink(e.target.value)}
            placeholder="https://buy.stripe.com/…"
            className={`input-field py-1.5 text-sm font-mono ${paymentLink && !paymentLinkOk ? "border-[var(--color-danger)]" : ""}`}
          />
          {paymentLink && !paymentLinkOk ? (
            <p className="mt-1 flex items-start gap-1.5 text-[11px] text-[var(--color-danger)]">
              <AlertTriangle size={12} className="mt-px shrink-0" />
              That isn't a valid Stripe link. Paste this customer's own payment link (buy.stripe.com / checkout.stripe.com).
            </p>
          ) : !paymentLink ? (
            <p className="mt-1 flex items-start gap-1.5 text-[11px] text-[var(--color-warning)]">
              <AlertTriangle size={12} className="mt-px shrink-0" />
              A payment email can't be sent without this customer's Stripe payment link.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
              Fills the {"{{payment_link}}"} button in the template. Its click is tracked on the lead separately.
            </p>
          )}
        </Field>
      ) : (
        <Field label="Stripe payment link (optional)">
          <input
            value={paymentLink}
            onChange={(e) => setPaymentLink(e.target.value)}
            placeholder="Not needed for an information email"
            className="input-field py-1.5 text-sm font-mono"
          />
        </Field>
      )}

      <Field label="Subject">
        <input
          value={subject}
          onChange={(e) => { subjectTouched.current = true; setSubject(e.target.value); }}
          className="input-field"
        />
      </Field>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Preview</span>
          {loadingPreview && <span className="text-[11px] text-[var(--color-text-tertiary)]">Rendering…</span>}
        </div>
        {/* Sandboxed: template HTML renders but can never run script or
            navigate the dialer. */}
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={rendered?.html || "<p style='font-family:sans-serif;color:#888;padding:12px'>Pick a template to preview.</p>"}
          className="h-72 w-full rounded-lg border border-[var(--color-border)] bg-white"
        />
        {rendered?.missing?.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-[var(--color-warning)]">
            <AlertTriangle size={12} className="mt-px shrink-0" />
            Not on file, so left blank: {rendered.missing.join(", ").replace(/_/g, " ")}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={runPreview} disabled={loadingPreview || !templateId} className="btn-outline flex-1">
          <Eye size={14} /> Refresh Preview
        </button>
        <button
          onClick={send}
          disabled={sending || !templateId || !subject.trim() || !paymentLinkOk}
          className="btn-purple flex-[2] disabled:opacity-40"
        >
          <Send size={14} /> {sending ? "Sending…" : isPayment ? "Send Payment Email" : "Send Email"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

const STATUS_LABEL = {
  queued: "Queued", sent: "Sent", delivered: "Delivered", opened: "Opened",
  clicked: "Link clicked", bounced: "Bounced", failed: "Failed",
  deferred: "Deferred", unsubscribed: "Unsubscribed", complained: "Marked as spam",
};

function StatusRow({ status }) {
  const label = STATUS_LABEL[status] || status || "Queued";
  const bad = status === "bounced" || status === "failed" || status === "complained";
  return (
    <span
      className="pill"
      style={{
        backgroundColor: bad ? "var(--color-danger-tint)" : "var(--color-success-tint)",
        color: bad ? "var(--color-danger)" : "var(--color-success)",
      }}
    >
      {label}
    </span>
  );
}
