import { useCallback, useEffect, useState } from "react";
import { Plus, FileText, Power, Trash2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import scriptService from "../services/scriptService";
import campaignService from "../services/campaignService";

export default function CampaignsScripts() {
  const { notify } = useToast();
  const [scripts, setScripts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, c] = await Promise.all([scriptService.list(), campaignService.list()]);
      setScripts(s?.data || []);
      setCampaigns(c?.data || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load scripts.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (s) => {
    try {
      await scriptService.update(s.id, { is_active: !s.is_active });
      notify(`"${s.title}" ${s.is_active ? "deactivated" : "reactivated"}.`, "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not update the script.", "error");
    }
  };

  const remove = async (s) => {
    try {
      await scriptService.remove(s.id);
      notify(`"${s.title}" deleted.`, "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not delete the script.", "error");
    }
  };

  const save = async (patch, existing) => {
    try {
      if (existing) {
        await scriptService.update(existing.id, patch);
        notify(`Script "${patch.title}" saved.`, "success");
      } else {
        await scriptService.create(patch);
        notify(`Script "${patch.title}" created.`, "success");
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save the script.", "error");
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Campaigns"
        title="Scripts"
        actions={
          <button onClick={() => setCreating(true)} className="btn-purple">
            <Plus size={15} /> New Script
          </button>
        }
      />
      <div className="p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : error ? (
          <EmptyState icon={FileText} title="Could not load scripts" description={error} />
        ) : scripts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No scripts yet"
            description="Create a script and assign it to a campaign — agents see it on every call."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scripts.map((s) => (
              <div key={s.id} className={`card ${s.is_active ? "" : "opacity-60"}`}>
                <button onClick={() => setEditing(s)} className="block w-full text-left">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText size={15} className="text-[var(--color-accent)]" />
                    <p className="font-medium text-[var(--color-text-primary)]">{s.title}</p>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {campaigns.find((c) => c.id === s.campaign_id)?.name ?? "Unassigned"}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{s.content}</p>
                </button>
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-[var(--color-border)] pt-2.5">
                  <button
                    onClick={() => toggleActive(s)}
                    title={s.is_active ? "Deactivate" : "Reactivate"}
                    className={`rounded p-1.5 hover:bg-[var(--color-bg)] ${s.is_active ? "text-[var(--color-success)]" : "text-[var(--color-text-tertiary)]"}`}
                  >
                    <Power size={14} />
                  </button>
                  <button
                    onClick={() => remove(s)}
                    title="Delete"
                    className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScriptEditor
        script={editing}
        campaigns={campaigns}
        onClose={() => setEditing(null)}
        onSave={(patch) => save(patch, editing)}
      />
      <ScriptEditor
        script={creating ? { title: "", content: "", campaign_id: "" } : null}
        campaigns={campaigns}
        onClose={() => setCreating(false)}
        onSave={(patch) => save(patch, null)}
      />
    </div>
  );
}

function ScriptEditor({ script, campaigns, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (script) {
      setTitle(script.title || "");
      setCampaignId(script.campaign_id || "");
      setContent(script.content || "");
    }
  }, [script]);

  if (!script) return null;

  return (
    <SidePanel
      open={Boolean(script)}
      onClose={onClose}
      title={script.title ? `Edit ${script.title}` : "New Script"}
      subtitle="Opening line and campaign assignment"
      widthClass="max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Script Name</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="e.g. Solar Homeowner Outreach — Opening Script"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Assigned Campaign</label>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field">
            {/* Unassigned is a real state — a script can be written before it
                is attached to anything. */}
            <option value="">Unassigned</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Opening / Intro</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="input-field resize-none" />
        </div>
        <button
          onClick={async () => {
            if (!title.trim()) return;
            setSaving(true);
            try {
              await onSave({ title: title.trim(), campaign_id: campaignId || null, content });
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving || !title.trim()}
          className="btn-purple w-full disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save Script"}
        </button>
      </div>
    </SidePanel>
  );
}
