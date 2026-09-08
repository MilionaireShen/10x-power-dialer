import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Mail, Copy, Power, Trash2, Send, AlertTriangle } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import emailService from "../services/emailService";
import campaignService from "../services/campaignService";

const CATEGORY_LABEL = {
  general: "General",
  vacation_offer: "Vacation Package Offer",
  payment_instructions: "Payment Instructions",
  booking_info: "Booking Information",
  travel_info: "Travel Information",
  promotion: "Special Promotion",
  follow_up: "Follow-Up",
};

const STARTER_HTML = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
  <h2 style="color:#1d4ed8">Hi {{first_name}},</h2>
  <p>It was great speaking with you today about your trip to <strong>{{destination}}</strong>.</p>
  <p>Your package <strong>{{package_name}}</strong> for {{guest_count}} guests is available for <strong>{{package_price}}</strong>.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="{{payment_link}}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
      Complete Your Payment
    </a>
  </p>
  <p>Talk soon,<br>{{agent_name}}<br>{{company_name}}</p>
</div>`;

export default function CampaignsEmailTemplates() {
  const { notify } = useToast();
  const [templates, setTemplates] = useState([]);
  const [variables, setVariables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // template object | { __new: true }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emailService.listTemplates();
      setTemplates(res?.data?.templates || []);
      setVariables(res?.data?.variables || []);
      setCategories(res?.data?.categories || []);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load email templates.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    campaignService.list().then((res) => setCampaigns(res?.data || [])).catch(() => setCampaigns([]));
  }, []);

  const duplicate = async (t) => {
    try { await emailService.duplicateTemplate(t.id); notify(`"${t.name}" duplicated (inactive).`, "success"); load(); }
    catch (err) { notify(err?.response?.data?.message || "Could not duplicate.", "error"); }
  };
  const toggleActive = async (t) => {
    try { await emailService.updateTemplate(t.id, { is_active: !t.is_active }); notify(`"${t.name}" ${t.is_active ? "deactivated" : "activated"}.`, "success"); load(); }
    catch (err) { notify(err?.response?.data?.message || "Could not update.", "error"); }
  };
  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    try { await emailService.deleteTemplate(t.id); notify(`"${t.name}" deleted.`, "success"); load(); }
    catch (err) { notify(err?.response?.data?.message || "Could not delete.", "error"); }
  };

  return (
    <div>
      <ScreenHeader
        category="Campaigns"
        title="Email Templates"
        actions={
          <button onClick={() => setEditing({ __new: true })} className="btn-purple">
            <Plus size={15} /> New Template
          </button>
        }
      />
      <div className="p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading templates…</p>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No email templates yet"
            description="Create a template so agents can send a branded package offer, payment instructions or follow-up without rebuilding it every call."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className={`card text-left transition-shadow hover:shadow-md ${t.is_active ? "" : "opacity-60"}`}>
                <button onClick={() => setEditing(t)} className="block w-full text-left">
                  <div className="mb-1 flex items-center gap-2">
                    <Mail size={15} className="text-[var(--color-accent)]" />
                    <p className="font-medium text-[var(--color-text-primary)]">{t.name}</p>
                  </div>
                  <p className="mb-2 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{t.subject}</p>
                </button>
                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="pill bg-[var(--color-bg)] text-[var(--color-text-tertiary)]">{CATEGORY_LABEL[t.category] || t.category}</span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">
                      {t.campaign_id ? campaigns.find((c) => c.id === t.campaign_id)?.name || "One campaign" : "All campaigns"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => duplicate(t)} title="Duplicate" className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)]"><Copy size={14} /></button>
                    <button onClick={() => toggleActive(t)} title={t.is_active ? "Deactivate" : "Activate"} className={`rounded p-1.5 hover:bg-[var(--color-bg)] ${t.is_active ? "text-[var(--color-success)]" : "text-[var(--color-text-tertiary)]"}`}><Power size={14} /></button>
                    <button onClick={() => remove(t)} title="Delete" className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-tint)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <TemplateEditor
          template={editing.__new ? null : editing}
          variables={variables}
          categories={categories}
          campaigns={campaigns}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ template, variables, categories, campaigns, onClose, onSaved }) {
  const { notify } = useToast();
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [category, setCategory] = useState(template?.category || "general");
  const [campaignId, setCampaignId] = useState(template?.campaign_id || "");
  const [isActive, setIsActive] = useState(template ? template.is_active !== false : true);
  const [html, setHtml] = useState(template?.html_body || (template ? "" : STARTER_HTML));
  const [text, setText] = useState(template?.text_body || "");
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const htmlRef = useRef(null);

  const src = useMemo(() => ({ subject, html_body: html, text_body: text }), [subject, html, text]);

  useEffect(() => {
    if (!html.trim() && !subject.trim()) { setPreview(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await emailService.previewTemplate(src);
        if (!cancelled) setPreview(res?.data || null);
      } catch { if (!cancelled) setPreview(null); }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [src, html, subject]);

  const insertVariable = (key) => {
    const token = `{{${key}}}`;
    const el = htmlRef.current;
    if (!el) { setHtml((h) => h + token); return; }
    const start = el.selectionStart ?? html.length;
    const end = el.selectionEnd ?? html.length;
    setHtml(html.slice(0, start) + token + html.slice(end));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
  };

  const save = async () => {
    if (!name.trim() || !subject.trim() || !html.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), subject: subject.trim(), category,
        campaign_id: campaignId || null, is_active: isActive,
        html_body: html, text_body: text || undefined,
      };
      if (template) await emailService.updateTemplate(template.id, payload);
      else await emailService.createTemplate(payload);
      notify(`Template "${name.trim()}" saved.`, "success");
      onSaved();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save the template.", "error");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!template) { notify("Save the template first, then send a test.", "warning"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo.trim())) { notify("Enter a valid test address.", "warning"); return; }
    setTesting(true);
    try {
      await emailService.sendTest(template.id, { to: testTo.trim() });
      notify(`Test email sent to ${testTo.trim()}.`, "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not send the test.", "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <SidePanel open onClose={onClose} title={template ? `Edit ${template.name}` : "New Email Template"} subtitle="HTML email · variables render before sending" widthClass="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Template Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Cancun Payment Instructions" />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              {(categories.length ? categories : Object.keys(CATEGORY_LABEL)).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c] || c}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Assigned Campaign">
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field">
              <option value="">All campaigns</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <button
              onClick={() => setIsActive((v) => !v)}
              className={`input-field flex items-center justify-between ${isActive ? "text-[var(--color-success)]" : "text-[var(--color-text-tertiary)]"}`}
            >
              {isActive ? "Active — agents can send it" : "Inactive — hidden from agents"}
              <Power size={14} />
            </button>
          </Field>
        </div>

        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field" placeholder="Your {{destination}} vacation — payment details" />
        </Field>

        <Field label="HTML Body">
          <textarea ref={htmlRef} value={html} onChange={(e) => setHtml(e.target.value)} rows={10} className="input-field resize-y font-mono text-xs" />
        </Field>

        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Insert Variable</p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <button key={v.key} type="button" title={v.label} onClick={() => insertVariable(v.key)}
                className="pill border border-[var(--color-accent)]/25 bg-[var(--color-accent-tint)] text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-white">
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>

        <Field label="Plain-text version (optional — auto-generated from the HTML if left blank)">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="input-field resize-y text-xs" />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">Preview (sample data)</p>
            {preview?.missing?.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
                <AlertTriangle size={11} /> unresolved: {preview.missing.join(", ")}
              </span>
            )}
          </div>
          {preview?.subject && <p className="mb-1 text-xs text-[var(--color-text-tertiary)]">Subject: <span className="text-[var(--color-text-primary)]">{preview.subject}</span></p>}
          <iframe title="Template preview" sandbox="" srcDoc={preview?.html || "<p style='font-family:sans-serif;color:#888;padding:12px'>Preview appears here…</p>"}
            className="h-80 w-full rounded-lg border border-[var(--color-border)] bg-white" />
        </div>

        <button onClick={save} disabled={saving || !name.trim() || !subject.trim() || !html.trim()} className="btn-purple w-full">
          {saving ? "Saving…" : "Save Template"}
        </button>

        {template && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Send Test Email</p>
            <div className="flex gap-2">
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className="input-field flex-1 py-1.5 text-sm" />
              <button onClick={sendTest} disabled={testing} className="btn-outline shrink-0 px-3 py-1.5 text-sm">
                <Send size={13} /> {testing ? "Sending…" : "Send"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
              Renders with sample data and sends through the real email backend, subject prefixed “[TEST]”. Not linked to any customer.
            </p>
          </div>
        )}
      </div>
    </SidePanel>
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
