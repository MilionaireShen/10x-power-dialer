import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import SidePanel from "./SidePanel";
import { useToast } from "../lib/ToastContext";
import campaignService from "../services/campaignService";
import smsService from "../services/smsService";
import leadService from "../services/leadService";
import CampaignDialerControl from "./CampaignDialerControl";

const CHAR_LIMIT = 160;

// Keyword lists are stored as arrays; the editor works in comma-separated text
// because that is what an admin can actually type.
const parseKeywords = (text) =>
  text.split(",").map((k) => k.trim().toUpperCase()).filter(Boolean);
const joinKeywords = (list) => (list || []).join(", ");

export default function CampaignSettingsPanel({ campaign, onClose, onSaved }) {
  const { notify } = useToast();
  const [tab, setTab] = useState("general");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [template, setTemplate] = useState("");
  const [confirmationEnabled, setConfirmationEnabled] = useState(false);
  const [inboundEnabled, setInboundEnabled] = useState(true);
  const [allowAgentReply, setAllowAgentReply] = useState(true);
  const [confirmTemplateId, setConfirmTemplateId] = useState("");
  const [confirmKeywords, setConfirmKeywords] = useState("");
  const [declineKeywords, setDeclineKeywords] = useState("");
  const [rescheduleKeywords, setRescheduleKeywords] = useState("");
  const [templates, setTemplates] = useState([]);
  const [variables, setVariables] = useState([]);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [leadLists, setLeadLists] = useState([]);
  const [leadListBusy, setLeadListBusy] = useState(false);
  const [addListId, setAddListId] = useState("");
  const [parallelDials, setParallelDials] = useState(3);
  const [parallelDialsSaving, setParallelDialsSaving] = useState(false);
  const textareaRef = useRef(null);

  const loadLeadLists = useCallback(() => {
    if (!campaign) return;
    leadService.listLists()
      .then((res) => setLeadLists(res?.data || []))
      .catch(() => { /* the Lead Lists section just shows empty */ });
  }, [campaign]);

  useEffect(() => {
    if (!campaign) return;
    setTab("general");
    setSmsEnabled(Boolean(campaign.sms_enabled));
    setTemplate(campaign.sms_template || "");
    setConfirmationEnabled(Boolean(campaign.sms_appointment_confirmation_enabled));
    setInboundEnabled(campaign.sms_inbound_enabled !== false);
    setAllowAgentReply(campaign.sms_allow_agent_reply !== false);
    setConfirmTemplateId(campaign.sms_confirmation_template_id || "");
    setConfirmKeywords(joinKeywords(campaign.sms_confirmation_keywords));
    setDeclineKeywords(joinKeywords(campaign.sms_decline_keywords));
    setRescheduleKeywords(joinKeywords(campaign.sms_reschedule_keywords));
    setParallelDials(campaign.default_parallel_dials || 3);
  }, [campaign]);

  const saveParallelDials = async () => {
    setParallelDialsSaving(true);
    try {
      await campaignService.update(campaign.id, { default_parallel_dials: parallelDials });
      notify(`Parallel Dials set to ${parallelDials} for "${campaign.name}".`, "success", { title: "Campaign Updated" });
      onSaved?.();
    } catch (err) {
      notify(err?.message || "Could not save Parallel Dials.", "error");
    } finally {
      setParallelDialsSaving(false);
    }
  };

  useEffect(() => {
    setAddListId("");
    loadLeadLists();
  }, [loadLeadLists]);

  useEffect(() => {
    if (!campaign) return;
    smsService.listTemplates({ campaign_id: campaign.id, active_only: "true" })
      .then((res) => {
        setTemplates(res?.data?.templates || []);
        setVariables(res?.data?.variables || []);
      })
      .catch(() => { /* the panel still saves without the template list */ });
  }, [campaign]);

  // Rendered by the server, using the engine that renders the real message —
  // a preview built here could disagree with what a customer receives.
  useEffect(() => {
    if (!template.trim()) { setPreview(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await smsService.previewTemplate({ body: template });
        if (!cancelled) setPreview(res?.data || null);
      } catch {
        if (!cancelled) setPreview(null);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [template]);

  if (!campaign) return null;

  const insertVariable = (key) => {
    const token = `{{${key}}}`;
    const el = textareaRef.current;
    if (!el) {
      setTemplate((t) => t + token);
      return;
    }
    const start = el.selectionStart ?? template.length;
    const end = el.selectionEnd ?? template.length;
    setTemplate(template.slice(0, start) + token + template.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  // Lead-list assignment goes through the same PATCH /leads/lists/:id endpoint
  // the Lead Lists screen uses, so the two stay in sync. onSaved() refreshes
  // the campaign list (leads_remaining etc.).
  const assignLeadList = async (listId, campaignId) => {
    setLeadListBusy(true);
    try {
      const res = await leadService.assignList(listId, campaignId);
      notify(res.message || "Lead list updated.", "success", { title: "Campaign Updated" });
      setAddListId("");
      loadLeadLists();
      onSaved?.();
    } catch (err) {
      notify(err?.message || "Could not update the lead list.", "error", { title: "Assignment Failed" });
    } finally {
      setLeadListBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await campaignService.update(campaign.id, {
        sms_enabled: smsEnabled,
        sms_template: template,
        sms_appointment_confirmation_enabled: confirmationEnabled,
        sms_inbound_enabled: inboundEnabled,
        sms_allow_agent_reply: allowAgentReply,
        sms_confirmation_template_id: confirmTemplateId || null,
        // Falls back to the defaults rather than saving an empty list, which
        // would leave a confirmation campaign with no way to recognise a YES.
        sms_confirmation_keywords: parseKeywords(confirmKeywords).length
          ? parseKeywords(confirmKeywords) : ["YES", "Y", "CONFIRM", "CONFIRMED"],
        sms_decline_keywords: parseKeywords(declineKeywords).length
          ? parseKeywords(declineKeywords) : ["NO", "CANCEL", "DECLINE"],
        sms_reschedule_keywords: parseKeywords(rescheduleKeywords).length
          ? parseKeywords(rescheduleKeywords) : ["RESCHEDULE", "CHANGE", "MOVE"],
      });
      notify(`SMS settings saved for "${campaign.name}".`, "success", { title: "Campaign Updated" });
      onClose();
      onSaved?.();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save SMS settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel open={Boolean(campaign)} onClose={onClose} title={campaign.name} subtitle="Campaign settings" widthClass="max-w-lg">
      <div className="mb-5 flex gap-2 border-b border-[var(--color-border)]">
        <TabButton active={tab === "general"} onClick={() => setTab("general")}>
          General
        </TabButton>
        <TabButton active={tab === "sms"} onClick={() => setTab("sms")}>
          SMS
        </TabButton>
      </div>

      {tab === "general" && (
        <div className="space-y-6">
          <dl className="space-y-2.5 text-sm">
            <Row label="Dialing Mode" value={`${campaign.dialing_mode} Mode`} />
            <Row label="Status" value={campaign.status} />
            <Row label="Agents Assigned" value={campaign.agent_count} />
            <Row label="Wrap-Up Time" value={`${campaign.wrapup_time_seconds}s`} />
          </dl>

          {campaign.dialing_mode === "parallel" && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Parallel Dials Per Agent</label>
              <div className="flex items-center gap-2">
                <select value={parallelDials} onChange={(e) => setParallelDials(Number(e.target.value))} className="input-field flex-1 py-1.5 text-sm">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button
                  onClick={saveParallelDials}
                  disabled={parallelDialsSaving || parallelDials === (campaign.default_parallel_dials || 3)}
                  className="btn-purple shrink-0 px-4 py-1.5 text-sm disabled:opacity-40"
                >
                  {parallelDialsSaving ? "Saving…" : "Save"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                Capped by the admin's maximum in Settings, and by an agent's own choice if they've set one.
              </p>
            </div>
          )}

          <LeadListSection
            campaign={campaign}
            leadLists={leadLists}
            busy={leadListBusy}
            addListId={addListId}
            setAddListId={setAddListId}
            onAssign={assignLeadList}
          />

          <CampaignDialerControl
            campaignId={campaign.id}
            mode={campaign.dialing_mode}
            campaignStatus={campaign.status}
          />
        </div>
      )}

      {tab === "sms" && (
        <div className="space-y-5">
          <Toggle
            label="Enable SMS for this Campaign"
            hint="Off by default — turn on per campaign"
            value={smsEnabled}
            onChange={setSmsEnabled}
          />

          {smsEnabled && (
            <>
              <Toggle
                label="Appointment Confirmation"
                hint="Let agents send a confirmation and track the customer's reply"
                value={confirmationEnabled}
                onChange={setConfirmationEnabled}
              />
              <Toggle
                label="Receive Inbound SMS"
                hint="Replies are always stored; this controls whether they are acted on"
                value={inboundEnabled}
                onChange={setInboundEnabled}
              />
              <Toggle
                label="Allow Agent Replies"
                hint="Off means only admins and managers can send on this campaign"
                value={allowAgentReply}
                onChange={setAllowAgentReply}
              />

              {confirmationEnabled && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Confirmation Template
                    </label>
                    <select value={confirmTemplateId} onChange={(e) => setConfirmTemplateId(e.target.value)} className="input-field">
                      <option value="">Use the campaign template below</option>
                      {templates
                        .filter((t) => t.message_type === "appointment_confirmation")
                        .map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">Reply Keywords</p>
                    <KeywordField
                      label="Confirms the appointment" value={confirmKeywords} onChange={setConfirmKeywords}
                      placeholder="YES, Y, CONFIRM"
                    />
                    <KeywordField
                      label="Declines the appointment" value={declineKeywords} onChange={setDeclineKeywords}
                      placeholder="NO, CANCEL"
                    />
                    <KeywordField
                      label="Asks to reschedule" value={rescheduleKeywords} onChange={setRescheduleKeywords}
                      placeholder="RESCHEDULE, MOVE"
                    />
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                      Anything else a customer sends is recorded as a question for someone to read — it is never
                      guessed at. STOP, HELP and START are handled separately and cannot be reconfigured.
                    </p>
                  </div>
                </>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Campaign SMS Template</label>
                  <span className={`text-xs ${template.length > CHAR_LIMIT ? "text-[var(--color-danger)]" : "text-[var(--color-text-tertiary)]"}`}>
                    {template.length}/{CHAR_LIMIT}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={5}
                  placeholder="Hi {{first_name}}, this is {{agent_name}} with {{company_name}}…"
                  className="input-field resize-none"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Insert Variable</p>
                <div className="flex flex-wrap gap-1.5">
                  {variables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      title={v.label}
                      onClick={() => insertVariable(v.key)}
                      className="pill border border-[var(--color-accent)]/25 bg-[var(--color-accent-tint)] text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-white"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Live Preview</p>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text-primary)]">
                  {preview?.text || <span className="text-[var(--color-text-tertiary)]">Preview will appear here…</span>}
                </div>
              </div>
            </>
          )}

          <button onClick={save} disabled={saving} className="btn-purple w-full py-3">
            {saving ? "Saving…" : "Save SMS Settings"}
          </button>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Agents will only see the Send SMS button on campaigns where SMS is enabled.
          </p>
        </div>
      )}
    </SidePanel>
  );
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      <div className="pr-3">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${value ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
      >
        <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function KeywordField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-[var(--color-text-tertiary)]">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-field py-1.5 text-sm" />
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2 last:border-0">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="font-medium text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}

function LeadListSection({ campaign, leadLists, busy, addListId, setAddListId, onAssign }) {
  const assigned = leadLists.filter((l) => l.assigned_campaign?.id === campaign.id);
  const assignable = leadLists.filter((l) => l.assigned_campaign?.id !== campaign.id);
  const totalLeads = assigned.reduce((s, l) => s + (l.lead_count ?? l.total_leads ?? 0), 0);
  const dialable = assigned.reduce((s, l) => s + (l.pending_count ?? 0), 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Lead Lists</h3>
        {assigned.length > 0 && (
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {totalLeads.toLocaleString()} leads · {dialable.toLocaleString()} dialable
          </span>
        )}
      </div>

      {assigned.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border-strong)] px-3 py-3 text-xs text-[var(--color-text-tertiary)]">
          No lead lists assigned — this campaign has no leads to dial yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {assigned.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
            >
              <div className="min-w-0 pr-2">
                <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{l.name}</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  {(l.lead_count ?? l.total_leads ?? 0).toLocaleString()} leads
                </p>
              </div>
              <button
                onClick={() => onAssign(l.id, null)}
                disabled={busy}
                title="Remove from this campaign"
                aria-label={`Remove ${l.name} from this campaign`}
                className="shrink-0 rounded-lg p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-danger-tint)] hover:text-[var(--color-danger)] disabled:opacity-40"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2.5 flex gap-2">
        <select
          value={addListId}
          onChange={(e) => setAddListId(e.target.value)}
          disabled={busy || assignable.length === 0}
          className="input-field flex-1 py-2 text-sm disabled:opacity-50"
        >
          <option value="">
            {assignable.length === 0 ? "No other lead lists — upload one first" : "Add a lead list…"}
          </option>
          {assignable.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({(l.lead_count ?? l.total_leads ?? 0).toLocaleString()})
              {l.assigned_campaign ? ` — now on ${l.assigned_campaign.name}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => addListId && onAssign(addListId, campaign.id)}
          disabled={busy || !addListId}
          className="btn-purple shrink-0 px-4 py-2 text-sm disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
        Adding a list moves its leads into this campaign so the dialer can call them. Removing sends them back to unassigned.
      </p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-[var(--color-accent)] text-[var(--color-accent)]"
          : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
      }`}
    >
      {children}
    </button>
  );
}
