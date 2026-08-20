import { useEffect, useRef, useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import { SMS_VARIABLES, SMS_PREVIEW_SAMPLE } from "../data/mockData";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

const CHAR_LIMIT = 160;

export default function CampaignsSmsTemplates() {
  const { smsTemplates, addSmsTemplate, updateSmsTemplate } = useAppData();
  const { notify } = useToast();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {smsTemplates.map((t) => (
            <button key={t.id} onClick={() => setEditing(t)} className="card text-left transition-shadow hover:shadow-md">
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare size={15} className="text-[var(--color-accent)]" />
                <p className="font-medium text-[var(--color-text-primary)]">{t.name}</p>
              </div>
              <p className="line-clamp-3 text-xs text-[var(--color-text-secondary)]">{t.body}</p>
            </button>
          ))}
        </div>
      </div>

      <TemplateEditor
        template={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          updateSmsTemplate(editing.id, patch);
          notify(`Template "${patch.name}" saved.`, "success");
          setEditing(null);
        }}
      />
      <TemplateEditor
        template={creating ? { name: "", body: "" } : null}
        onClose={() => setCreating(false)}
        onSave={(patch) => {
          addSmsTemplate(patch);
          notify(`Template "${patch.name}" created.`, "success");
          setCreating(false);
        }}
      />
    </div>
  );
}

function TemplateEditor({ template, onClose, onSave }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setBody(template.body || "");
    }
  }, [template]);

  if (!template) return null;

  const insertVariable = (variable) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => b + variable);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + variable + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + variable.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const preview = SMS_VARIABLES.reduce((text, v) => text.replaceAll(v, SMS_PREVIEW_SAMPLE[v]), body);

  return (
    <SidePanel open={Boolean(template)} onClose={onClose} title={template.name ? `Edit ${template.name}` : "New SMS Template"} subtitle="Reusable across any campaign" widthClass="max-w-lg">
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Template Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Appointment Confirmation" />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Message Body</label>
            <span className={`text-xs ${body.length > CHAR_LIMIT ? "text-[var(--color-danger)]" : "text-[var(--color-text-tertiary)]"}`}>
              {body.length}/{CHAR_LIMIT}
            </span>
          </div>
          <textarea ref={textareaRef} value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="input-field resize-none" />
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

        <button
          onClick={() => {
            if (!name.trim()) return;
            onSave({ name, body });
          }}
          className="btn-purple w-full"
        >
          Save Template
        </button>
      </div>
    </SidePanel>
  );
}
