import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, MessageSquare, Copy, Power, AlertTriangle } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import smsService from "../services/smsService";

const CHAR_LIMIT = 160;

const MESSAGE_TYPES = [
  { value: "general", label: "General" },
  { value: "appointment_confirmation", label: "Appointment Confirmation" },
  { value: "appointment_reminder", label: "Appointment Reminder" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "reschedule", label: "Reschedule" },
];

export default function CampaignsSmsTemplates() {
  const { notify } = useToast();
  const [templates, setTemplates] = useState([]);
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await smsService.listTemplates();
      setTemplates(res?.data?.templates || []);
      // The variable list comes from the renderer that will actually resolve
      // them, so the picker cannot offer a variable the server does not know.
      setVariables(res?.data?.variables || []);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load SMS templates.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const duplicate = async (t) => {
    try {
      await smsService.duplicateTemplate(t.id);
      notify(`"${t.name}" duplicated.`, "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not duplicate the template.", "error");
    }
  };

  const toggleActive = async (t) => {
    try {
      await smsService.updateTemplate(t.id, { is_active: !t.is_active });
      notify(`"${t.name}" ${t.is_active ? "deactivated" : "reactivated"}.`, "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not update the template.", "error");
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Campaigns"
        title="SMS Templates"
        actions={
          <button onClick={() => setCreating(true)} className="btn-purple">
            <Plus size={15} /> New Template
          </button>
        }
      />
      <div className="p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading templates…</p>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No SMS templates yet"
            description="Create a template so agents can send a consistent confirmation without retyping it on every call."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className={`card text-left transition-shadow hover:shadow-md ${t.is_active ? "" : "opacity-60"}`}>
                <button onClick={() => setEditing(t)} className="block w-full text-left">
                  <div className="mb-2 flex items-center gap-2">
                    <MessageSquare size={15} className="text-[var(--color-accent)]" />
                    <p className="font-medium text-[var(--color-text-primary)]">{t.name}</p>
                  </div>
                  <p className="mb-2 line-clamp-3 text-xs text-[var(--color-text-secondary)]">{t.body}</p>
                </button>
                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
                  <span className="pill bg-[var(--color-bg)] text-[var(--color-text-tertiary)]">
                    {MESSAGE_TYPES.find((m) => m.value === t.message_type)?.label || t.message_type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => duplicate(t)} title="Duplicate" className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)]">
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => toggleActive(t)}
                      title={t.is_active ? "Deactivate" : "Reactivate"}
                      className={`rounded p-1.5 hover:bg-[var(--color-bg)] ${t.is_active ? "text-[var(--color-success)]" : "text-[var(--color-text-tertiary)]"}`}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateEditor
        template={editing}
        variables={variables}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          try {
            await smsService.updateTemplate(editing.id, patch);
            notify(`Template "${patch.name}" saved.`, "success");
            setEditing(null);
            load();
          } catch (err) {
            notify(err?.response?.data?.message || "Could not save the template.", "error");
          }
        }}
      />
      <TemplateEditor
        template={creating ? { name: "", body: "", message_type: "general" } : null}
        variables={variables}
        onClose={() => setCreating(false)}
        onSave={async (patch) => {
          try {
            await smsService.createTemplate(patch);
            notify(`Template "${patch.name}" created.`, "success");
            setCreating(false);
            load();
          } catch (err) {
            notify(err?.response?.data?.message || "Could not create the template.", "error");
          }
        }}
      />
    </div>
  );
}

function TemplateEditor({ template, variables, onClose, onSave }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState("general");
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setBody(template.body || "");
      setMessageType(template.message_type || "general");
      setPreview(null);
    }
  }, [template]);

  // Rendered by the server, using the same engine that renders the real
  // message. A preview built in the browser could easily disagree with what a
  // customer actually receives.
  useEffect(() => {
    if (!template || !body.trim()) { setPreview(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await smsService.previewTemplate({ body });
        if (!cancelled) setPreview(res?.data || null);
      } catch {
        if (!cancelled) setPreview(null);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [body, template]);

  if (!template) return null;

  const insertVariable = (variable) => {
    const token = `{{${variable}}}`;
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <SidePanel
      open={Boolean(template)}
      onClose={onClose}
      title={template.name ? `Edit ${template.name}` : "New SMS Template"}
      subtitle="Reusable across any campaign"
      widthClass="max-w-lg"
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Template Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Roofing Inspection Confirmation" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Message Type</label>
          <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="input-field">
            {MESSAGE_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Message Body</label>
            <span className={`text-xs ${body.length > CHAR_LIMIT ? "text-[var(--color-danger)]" : "text-[var(--color-text-tertiary)]"}`}>
              {body.length}/{CHAR_LIMIT}
              {preview?.segments > 1 && ` · ${preview.segments} segments`}
            </span>
          </div>
          <textarea ref={textareaRef} value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="input-field resize-none" />
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
          {/* A variable the renderer does not recognise resolves to nothing, so
              the customer sees a sentence with a hole in it rather than a
              placeholder. Worth saying before the template is saved. */}
          {preview?.unknown?.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--color-warning)]">
              <AlertTriangle size={13} className="mt-px shrink-0" />
              Not a known variable and will be dropped when sending: {preview.unknown.map((u) => `{{${u}}}`).join(", ")}
            </p>
          )}
        </div>

        <button
          onClick={async () => {
            if (!name.trim() || !body.trim()) return;
            setSaving(true);
            try {
              await onSave({ name: name.trim(), body, message_type: messageType });
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving || !name.trim() || !body.trim()}
          className="btn-purple w-full"
        >
          {saving ? "Saving…" : "Save Template"}
        </button>
      </div>
    </SidePanel>
  );
}
