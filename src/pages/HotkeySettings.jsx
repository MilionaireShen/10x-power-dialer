import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import { useToast } from "../lib/ToastContext";
import campaignService from "../services/campaignService";
import hotkeyService from "../services/hotkeyService";
import dispositionService from "../services/dispositionService";

const COLOR_CHOICES = ["#EF4444", "#6B7280", "#F59E0B", "#10B981", "#3B82F6", "#F97316", "#991B1B", "#7C3AED"];

function mapRow(h) {
  return {
    id: h.id,
    keyBinding: h.key_binding,
    dispositionId: h.disposition_id,
    dispositionLabel: h.dispositions?.label ?? "—",
    label: h.label,
    color: h.color,
    active: h.is_active,
  };
}

export default function HotkeySettings() {
  const { notify } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [dispositions, setDispositions] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [hotkeys, setHotkeys] = useState([]);
  const [isOverride, setIsOverride] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editingHotkey, setEditingHotkey] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    Promise.all([campaignService.list(), dispositionService.list()])
      .then(([campaignsRes, dispositionsRes]) => {
        setCampaigns(campaignsRes.data || []);
        setDispositions(dispositionsRes.data || []);
      })
      .catch(() => {});
  }, []);

  const loadHotkeys = useCallback(() => {
    setLoaded(false);
    const request = campaignId ? hotkeyService.getForCampaign(campaignId) : hotkeyService.getDefault();
    request
      .then((res) => {
        setHotkeys((res.data || []).map(mapRow));
        setIsOverride(Boolean(res.meta?.is_override));
      })
      .catch(() => notify("Could not load hotkeys.", "error"))
      .finally(() => setLoaded(true));
  }, [campaignId, notify]);

  useEffect(() => {
    loadHotkeys();
  }, [loadHotkeys]);

  const persist = async (next, successMessage) => {
    try {
      const res = await hotkeyService.saveBulk(
        campaignId || null,
        next.map((h) => ({ key_binding: h.keyBinding, disposition_id: h.dispositionId, label: h.label, color: h.color, is_active: h.active }))
      );
      setHotkeys((res.data || []).map(mapRow));
      setIsOverride(Boolean(campaignId));
      if (successMessage) notify(successMessage, "success");
    } catch (err) {
      notify(err?.message || "Could not save hotkeys.", "error");
    }
  };

  const toggleActive = (id) => {
    persist(hotkeys.map((h) => (h.id === id ? { ...h, active: !h.active } : h)));
  };

  const deleteHotkey = (id) => {
    persist(
      hotkeys.filter((h) => h.id !== id),
      "Hotkey deleted."
    );
  };

  const reorder = (from, to) => {
    const next = [...hotkeys];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persist(next);
  };

  const saveHotkey = (data) => {
    if (editingHotkey) {
      persist(
        hotkeys.map((h) => (h.id === editingHotkey.id ? { ...h, ...data } : h)),
        `Hotkey ${data.keyBinding} updated.`
      );
    } else {
      persist([...hotkeys, { id: `pending-${Date.now()}`, ...data }], `Hotkey ${data.keyBinding} added.`);
    }
    setEditingHotkey(null);
    setAddingNew(false);
  };

  const clearOverride = () => {
    persist([], "Custom hotkeys cleared — this campaign now uses the company default.");
  };

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Hotkey Settings"
        actions={
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field w-auto">
            <option value="">Company Default (All Campaigns)</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="p-8 space-y-4">
        {campaignId && (
          <div
            className="card border text-sm"
            style={{
              borderColor: isOverride ? "var(--color-accent)" : "var(--color-border)",
              backgroundColor: isOverride ? "var(--color-accent-tint)" : "white",
              color: isOverride ? "var(--color-accent)" : "var(--color-text-secondary)",
            }}
          >
            {isOverride
              ? `${campaigns.find((c) => c.id === campaignId)?.name} has its own custom hotkeys.`
              : `${campaigns.find((c) => c.id === campaignId)?.name} is currently using the company default hotkeys — editing here creates a custom set just for this campaign.`}
          </div>
        )}

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-4 py-3 font-medium">Key Binding</th>
                <th className="px-4 py-3 font-medium">Disposition</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Color</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hotkeys.map((h, i) => (
                <tr
                  key={h.id}
                  draggable
                  onDragStart={() => (dragIndex.current = i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(i);
                  }}
                  onDragLeave={() => setDragOverIndex((cur) => (cur === i ? null : cur))}
                  onDrop={() => {
                    if (dragIndex.current === null || dragIndex.current === i) return;
                    reorder(dragIndex.current, i);
                    dragIndex.current = null;
                    setDragOverIndex(null);
                  }}
                  className={`cursor-grab border-b border-[var(--color-border)] last:border-0 transition-colors ${
                    dragOverIndex === i ? "bg-[var(--color-accent-tint)]" : i % 2 ? "bg-[var(--color-bg)]" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="shrink-0 text-[var(--color-text-tertiary)]" />
                      <span className="rounded bg-[var(--color-bg)] px-2 py-1 font-mono text-xs font-semibold text-[var(--color-text-primary)]">{h.keyBinding}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{h.dispositionLabel}</td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{h.label}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: h.color }} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(h.id)}
                      className={`h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${h.active ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                    >
                      <span className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform duration-200 ${h.active ? "translate-x-4" : ""}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-xs">
                      <button onClick={() => setEditingHotkey(h)} className="flex items-center gap-1 font-medium text-[var(--color-accent)] hover:underline">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => deleteHotkey(h.id)} className="flex items-center gap-1 font-medium text-[var(--color-danger)] hover:underline">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loaded && hotkeys.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-tertiary)]">
                    No hotkeys configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-3">
          {campaignId && isOverride && (
            <button onClick={clearOverride} className="btn-gray">
              Clear Override (Use Company Default)
            </button>
          )}
          <button onClick={() => setAddingNew(true)} className="btn-purple">
            Add New Hotkey
          </button>
        </div>
      </div>

      <HotkeyFormPanel
        key={editingHotkey?.id ?? (addingNew ? "new" : "closed")}
        open={Boolean(editingHotkey) || addingNew}
        hotkey={editingHotkey}
        dispositions={dispositions}
        onClose={() => {
          setEditingHotkey(null);
          setAddingNew(false);
        }}
        onSave={saveHotkey}
      />
    </div>
  );
}

function HotkeyFormPanel({ open, hotkey, dispositions, onClose, onSave }) {
  const [keyBinding, setKeyBinding] = useState(hotkey?.keyBinding ?? "");
  const [dispositionId, setDispositionId] = useState(hotkey?.dispositionId ?? dispositions[0]?.id ?? "");
  const [label, setLabel] = useState(hotkey?.label ?? "");
  const [color, setColor] = useState(hotkey?.color ?? COLOR_CHOICES[0]);
  const [active, setActive] = useState(hotkey?.active ?? true);
  const { notify } = useToast();

  const save = () => {
    if (!keyBinding.trim()) {
      notify("Enter a key binding, e.g. F1 or ctrl+1.", "warning");
      return;
    }
    if (!label.trim()) {
      notify("Give this hotkey a display label.", "warning");
      return;
    }
    if (!dispositionId) {
      notify("Choose a disposition for this hotkey.", "warning");
      return;
    }
    onSave({ keyBinding: keyBinding.trim(), dispositionId, label: label.trim(), color, active });
  };

  return (
    <SidePanel open={open} onClose={onClose} title={hotkey ? `Edit ${hotkey.keyBinding}` : "Add New Hotkey"} subtitle="Quick-dispose shortcut for the agent call screen">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Key Binding</label>
          <input value={keyBinding} onChange={(e) => setKeyBinding(e.target.value)} placeholder="F1, F9, ctrl+1…" className="input-field font-mono" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Disposition</label>
          <select value={dispositionId} onChange={(e) => setDispositionId(e.target.value)} className="input-field">
            {dispositions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Display Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Not Interested" className="input-field" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-8 w-8 rounded-full border-2 transition-transform"
                style={{ backgroundColor: c, borderColor: color === c ? "var(--color-text-primary)" : "transparent" }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Active</p>
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${active ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
          >
            <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${active ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <button onClick={save} className="btn-purple w-full py-3">
          Save Hotkey
        </button>
      </div>
    </SidePanel>
  );
}
