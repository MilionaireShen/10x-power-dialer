import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Zap, BatteryCharging, ArrowRightCircle, Search, Layers } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import CampaignSettingsPanel from "../components/CampaignSettingsPanel";
import { useToast } from "../lib/ToastContext";
import campaignService from "../services/campaignService";
import userService from "../services/userService";

const DIALING_MODES = [
  { key: "predictive", icon: Zap, title: "Predictive", description: "Maximum volume — algorithm dials multiple numbers ahead per agent." },
  { key: "parallel", icon: Layers, title: "Parallel", description: "Each agent's own leads dialed simultaneously — the first to answer connects, the rest end." },
  { key: "power", icon: BatteryCharging, title: "Power", description: "Preset number of lines dialed per agent simultaneously." },
  { key: "progressive", icon: ArrowRightCircle, title: "Progressive", description: "Automatically dials the next call the moment the previous one ends." },
  { key: "preview", icon: Search, title: "Preview", description: "Agent reviews the full lead profile before the call launches." },
];

const STATUS_COLOR = { active: "var(--color-success)", paused: "var(--color-warning)", completed: "var(--color-text-tertiary)", draft: "var(--color-text-tertiary)" };

export default function CampaignsAll() {
  const { notify } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [campaignsRes, usersRes] = await Promise.all([campaignService.list(), userService.list()]);
      setCampaigns(campaignsRes.data || []);
      setAgents((usersRes.data || []).filter((u) => u.role === "agent" && u.status === "active"));
    } catch {
      // leave whatever was last loaded on screen
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const togglePause = async (campaign) => {
    if (campaign.status === "completed") return;
    const nextStatus = campaign.status === "active" ? "paused" : "active";
    try {
      await campaignService.update(campaign.id, { status: nextStatus });
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, status: nextStatus } : c)));
    } catch {
      notify("Could not update campaign status.", "error");
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Campaigns"
        title="All Campaigns"
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-purple">
            <Plus size={15} /> Create New Campaign
          </button>
        }
      />

      <div className="p-8">
        {loaded && campaigns.length === 0 ? (
          <div className="card text-sm text-[var(--color-text-tertiary)]">No campaigns yet — create one to get started.</div>
        ) : (
          <div className="card space-y-0 divide-y divide-[var(--color-border)] p-0 overflow-x-auto">
            {campaigns.map((c) => (
              <div key={c.id} className="flex min-w-[1080px] items-center gap-4 px-5 py-4">
                <div className="w-56 shrink-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                  <span
                    className="pill mt-1 text-[10px] capitalize"
                    style={{ backgroundColor: `color-mix(in srgb, ${STATUS_COLOR[c.status] ?? "var(--color-text-tertiary)"} 14%, white)`, color: STATUS_COLOR[c.status] ?? "var(--color-text-tertiary)" }}
                  >
                    {c.status}
                  </span>
                </div>

                <span className="pill w-fit shrink-0 border border-[var(--color-accent)]/25 bg-[var(--color-accent-tint)] text-[var(--color-accent)] capitalize">
                  {c.dialing_mode} Mode
                </span>

                {c.sms_enabled && (
                  <span className="pill w-fit shrink-0 border border-[var(--color-success)]/25 bg-[var(--color-success-tint)] text-[var(--color-success)]">
                    SMS On
                  </span>
                )}

                <span className="w-20 shrink-0 text-sm text-[var(--color-text-secondary)]">{c.agent_count} agents</span>

                <div className="min-w-[140px] flex-1">
                  <div className="flex gap-4 text-[11px] text-[var(--color-text-tertiary)]">
                    <span>{c.leads_remaining} leads remaining</span>
                  </div>
                </div>

                <span className="w-24 shrink-0 text-right text-sm font-medium text-[var(--color-text-primary)]">
                  {c.calls_today.toLocaleString()} calls
                </span>

                <div className="flex shrink-0 gap-2">
                  <button onClick={() => togglePause(c)} disabled={c.status === "completed"} className="btn-gray disabled:opacity-30">
                    {c.status === "active" ? "Pause" : "Resume"}
                  </button>
                  <button onClick={() => setEditingCampaign(c)} className="btn-outline">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateCampaignPanel open={createOpen} onClose={() => setCreateOpen(false)} agents={agents} onCreated={refresh} />
      <CampaignSettingsPanel campaign={editingCampaign} onClose={() => setEditingCampaign(null)} onSaved={refresh} />
    </div>
  );
}

function CreateCampaignPanel({ open, onClose, agents, onCreated }) {
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [mode, setMode] = useState("predictive");
  const [parallelDials, setParallelDials] = useState(3);
  const [wrapUp, setWrapUp] = useState(60);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("21:00");
  const [tzIntel, setTzIntel] = useState(true);
  const [agentIds, setAgentIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleAgent = (id) => {
    setAgentIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const reset = () => {
    setName("");
    setMode("predictive");
    setParallelDials(3);
    setWrapUp(60);
    setAgentIds([]);
  };

  const save = async () => {
    if (!name.trim()) {
      notify("Give your campaign a name before saving.", "warning");
      return;
    }
    setSaving(true);
    try {
      await campaignService.create({
        name,
        dialing_mode: mode,
        // Only meaningful for Parallel mode — sent regardless so switching a
        // campaign to Parallel later already has a sane value in place, per
        // the campaign's own default_parallel_dials column.
        default_parallel_dials: parallelDials,
        wrapup_time_seconds: wrapUp,
        calling_hours_start: `${startTime}:00`,
        calling_hours_end: `${endTime}:00`,
        timezone_enforcement: tzIntel,
        agent_ids: agentIds,
      });
      notify(`Campaign "${name}" created.`, "success", { title: "Campaign Saved" });
      reset();
      onClose();
      onCreated();
    } catch (err) {
      notify(err?.message || "Could not create the campaign.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel open={open} onClose={onClose} title="Create New Campaign" subtitle="Configure dialing behavior and assignments" widthClass="max-w-lg">
      <div className="space-y-6">
        <Field label="Campaign Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fall Roofing Outreach" className="input-field" />
        </Field>

        <Field label="Dialing Mode">
          <div className="grid grid-cols-1 gap-2.5">
            {DIALING_MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className="flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all duration-150"
                  style={{ borderColor: active ? "var(--color-accent)" : "var(--color-border)", backgroundColor: active ? "var(--color-accent-tint)" : "white" }}
                >
                  <Icon size={18} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                  <span>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{m.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{m.description}</p>
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        {mode === "parallel" && (
          <Field label="Parallel Dials Per Agent">
            <select value={parallelDials} onChange={(e) => setParallelDials(Number(e.target.value))} className="input-field">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
              How many of an agent's leads are dialed simultaneously — the first to answer connects, the rest end.
              Still capped by the admin's maximum in Settings, and by an agent's own choice if they've set one.
            </p>
          </Field>
        )}

        <Field label={`Wrap-Up Time — ${wrapUp}s`}>
          <input type="range" min={15} max={120} step={5} value={wrapUp} onChange={(e) => setWrapUp(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
          <div className="flex justify-between text-[11px] text-[var(--color-text-tertiary)]">
            <span>15s</span>
            <span>120s</span>
          </div>
        </Field>

        <Field label="Calling Hours">
          <div className="flex items-center gap-3">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field" />
            <span className="text-[var(--color-text-tertiary)]">to</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field" />
          </div>
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Timezone Intelligence</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">Auto-blocks calls outside 8am–9pm lead local time</p>
          </div>
          <button
            onClick={() => setTzIntel((v) => !v)}
            className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${tzIntel ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
          >
            <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${tzIntel ? "translate-x-5" : ""}`} />
          </button>
        </div>

        <Field label={`Assign Agents (${agentIds.length} selected)`}>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-border)] p-2">
            {agents.length === 0 && <p className="px-2 py-1.5 text-xs text-[var(--color-text-tertiary)]">No active agents yet.</p>}
            {agents.map((a) => (
              <label key={a.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]">
                <input type="checkbox" checked={agentIds.includes(a.id)} onChange={() => toggleAgent(a.id)} className="accent-[var(--color-accent)]" />
                {a.first_name} {a.last_name}
              </label>
            ))}
          </div>
        </Field>

        <p className="text-xs text-[var(--color-text-tertiary)]">
          Assign lead lists after the campaign is created — from Edit → General → Lead Lists, or from Leads → Lead Lists.
        </p>

        <button onClick={save} disabled={saving} className="btn-purple w-full py-3">
          {saving ? "Saving…" : "Save Campaign"}
        </button>
      </div>
    </SidePanel>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}
