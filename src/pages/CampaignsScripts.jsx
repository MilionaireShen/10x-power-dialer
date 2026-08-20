import { useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function CampaignsScripts() {
  const { scripts, campaigns, addScript, updateScript } = useAppData();
  const { notify } = useToast();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scripts.map((s) => (
            <button key={s.id} onClick={() => setEditing(s)} className="card text-left transition-shadow hover:shadow-md">
              <div className="mb-2 flex items-center gap-2">
                <FileText size={15} className="text-[var(--color-accent)]" />
                <p className="font-medium text-[var(--color-text-primary)]">{s.name}</p>
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)]">{campaigns.find((c) => c.id === s.campaignId)?.name ?? "Unassigned"}</p>
              <p className="mt-2 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{s.intro}</p>
            </button>
          ))}
        </div>
      </div>

      <ScriptEditor
        script={editing}
        campaigns={campaigns}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          updateScript(editing.id, patch);
          notify(`Script "${patch.name}" saved.`, "success");
          setEditing(null);
        }}
      />
      <ScriptEditor
        script={creating ? { name: "", intro: "", keyPoints: [], campaignId: campaigns[0]?.id } : null}
        campaigns={campaigns}
        onClose={() => setCreating(false)}
        onSave={(patch) => {
          addScript(patch);
          notify(`Script "${patch.name}" created.`, "success");
          setCreating(false);
        }}
      />
    </div>
  );
}

function ScriptEditor({ script, campaigns, onClose, onSave }) {
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [intro, setIntro] = useState("");

  useEffect(() => {
    if (script) {
      setName(script.name || "");
      setCampaignId(script.campaignId || campaigns[0]?.id || "");
      setIntro(script.intro || "");
    }
  }, [script, campaigns]);

  if (!script) return null;

  return (
    <SidePanel open={Boolean(script)} onClose={onClose} title={script.name ? `Edit ${script.name}` : "New Script"} subtitle="Opening line and campaign assignment" widthClass="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Script Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Solar Homeowner Outreach — Opening Script" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Assigned Campaign</label>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field">
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Opening / Intro</label>
          <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={6} className="input-field resize-none" />
        </div>
        <button
          onClick={() => {
            if (!name.trim()) return;
            onSave({ name, campaignId, intro });
          }}
          className="btn-purple w-full"
        >
          Save Script
        </button>
      </div>
    </SidePanel>
  );
}
