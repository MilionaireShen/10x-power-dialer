import { useEffect, useRef, useState } from "react";
import SidePanel from "./SidePanel";
import { SMS_VARIABLES, SMS_PREVIEW_SAMPLE } from "../data/mockData";
import { useToast } from "../lib/ToastContext";
import campaignService from "../services/campaignService";

const CHAR_LIMIT = 160;

export default function CampaignSettingsPanel({ campaign, onClose, onSaved }) {
  const { notify } = useToast();
  const [tab, setTab] = useState("general");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [template, setTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!campaign) return;
    setTab("general");
    setSmsEnabled(Boolean(campaign.sms_enabled));
    setTemplate(campaign.sms_template || "");
  }, [campaign]);

  if (!campaign) return null;

  const insertVariable = (variable) => {
    const el = textareaRef.current;
    if (!el) {
      setTemplate((t) => t + variable);
      return;
    }
    const start = el.selectionStart ?? template.length;
    const end = el.selectionEnd ?? template.length;
    const next = template.slice(0, start) + variable + template.slice(end);
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + variable.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const preview = SMS_VARIABLES.reduce((text, v) => text.replaceAll(v, SMS_PREVIEW_SAMPLE[v]), template);

  const save = async () => {
    setSaving(true);
    try {
      await campaignService.update(campaign.id, { sms_enabled: smsEnabled, sms_template: template });
      notify(`SMS settings saved for "${campaign.name}".`, "success", { title: "Campaign Updated" });
      onClose();
      onSaved?.();
    } catch (err) {
      notify(err?.message || "Could not save SMS settings.", "error");
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
        <dl className="space-y-2.5 text-sm">
          <Row label="Dialing Mode" value={`${campaign.dialing_mode} Mode`} />
          <Row label="Status" value={campaign.status} />
          <Row label="Agents Assigned" value={campaign.agent_count} />
          <Row label="Leads Remaining" value={campaign.leads_remaining} />
          <Row label="Wrap-Up Time" value={`${campaign.wrapup_time_seconds}s`} />
        </dl>
      )}

      {tab === "sms" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable SMS for this Campaign</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Off by default — turn on per campaign</p>
            </div>
            <button
              onClick={() => setSmsEnabled((v) => !v)}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${smsEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
            >
              <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${smsEnabled ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {smsEnabled && (
            <>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">SMS Template</label>
                  <span className={`text-xs ${template.length > CHAR_LIMIT ? "text-[var(--color-danger)]" : "text-[var(--color-text-tertiary)]"}`}>
                    {template.length}/{CHAR_LIMIT}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={5}
                  placeholder="Hi {lead_name}, this is {agent_name} with {company_name}…"
                  className="input-field resize-none"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Insert Variable</p>
                <div className="flex flex-wrap gap-1.5">
                  {SMS_VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="pill border border-[var(--color-accent)]/25 bg-[var(--color-accent-tint)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Live Preview</p>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text-primary)]">
                  {preview || <span className="text-[var(--color-text-tertiary)]">Preview will appear here…</span>}
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

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 capitalize">
      <dt className="text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="text-right text-[var(--color-text-secondary)]">{value}</dd>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
        active ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
      }`}
    >
      {children}
    </button>
  );
}
