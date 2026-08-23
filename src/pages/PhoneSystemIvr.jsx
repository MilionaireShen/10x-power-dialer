import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ListTree } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";
import campaignService from "../services/campaignService";
import didService from "../services/didService";

// What each keypress on an inbound menu does. "Routes To" used to be free
// text, which meant a menu could point at a queue name that did not exist —
// it is now a real campaign, or a terminal action with nothing to point at.
const ACTIONS = [
  { value: "route_to_campaign", label: "Route to campaign" },
  { value: "voicemail", label: "Send to voicemail" },
  { value: "repeat_menu", label: "Repeat the menu" },
  { value: "hangup", label: "Hang up" },
];

export default function PhoneSystemIvr() {
  const { notify } = useToast();
  const [rules, setRules] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [dids, setDids] = useState([]);
  const [didId, setDidId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const [keyPress, setKeyPress] = useState("");
  const [label, setLabel] = useState("");
  const [action, setAction] = useState(ACTIONS[0].value);
  const [campaignId, setCampaignId] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, c, d] = await Promise.all([
        adminService.listIvrRules(didId ? { did_id: didId } : undefined),
        campaignService.list(),
        didService.list(),
      ]);
      setRules(r?.data?.rules || []);
      setCampaigns(c?.data || []);
      setDids(d?.data || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load the IVR menu.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [didId, notify]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!keyPress.trim() || !label.trim()) {
      notify("Enter a key and a label for the menu option.", "warning");
      return;
    }
    setBusy("new");
    try {
      await adminService.createIvrRule({
        key_press: keyPress.trim(),
        label: label.trim(),
        action,
        campaign_id: action === "route_to_campaign" ? campaignId || null : null,
        did_id: didId || null,
        display_order: rules.length,
      });
      notify(`Menu option "${label.trim()}" added.`, "success");
      setKeyPress("");
      setLabel("");
      setCampaignId("");
      load();
    } catch (err) {
      // The server refuses a duplicate key and says which — passed through.
      notify(err?.response?.data?.message || "Could not add the option.", "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (rule) => {
    setBusy(rule.id);
    try {
      await adminService.deleteIvrRule(rule.id);
      notify(`Option ${rule.key_press} removed.`, "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not remove the option.", "error");
    } finally {
      setBusy(null);
    }
  };

  const describe = (r) => {
    if (r.action === "route_to_campaign") return r.campaign?.name || "No campaign set";
    return ACTIONS.find((a) => a.value === r.action)?.label || r.action;
  };

  return (
    <div>
      <ScreenHeader category="Phone System" title="IVR Settings" />
      <div className="space-y-6 p-8">
        <div className="card">
          <label className="mb-4 block max-w-sm">
            <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Menu for</span>
            <select value={didId} onChange={(e) => setDidId(e.target.value)} className="input-field">
              <option value="">All numbers (default menu)</option>
              {dids.map((d) => <option key={d.id} value={d.id}>{d.phone_number}</option>)}
            </select>
          </label>

          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Add Menu Option</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-20">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Key</label>
              <input value={keyPress} onChange={(e) => setKeyPress(e.target.value)} maxLength={1} className="input-field text-center" />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Billing Questions" className="input-field" />
            </div>
            <div className="min-w-[180px]">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value)} className="input-field">
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {action === "route_to_campaign" && (
              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Campaign</label>
                <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field">
                  <option value="">Choose a campaign…</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={add} disabled={busy === "new"} className="btn-purple disabled:opacity-40">
              <Plus size={15} /> Add
            </button>
          </div>
        </div>

        <div className="card divide-y divide-[var(--color-border)] p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : error ? (
            <div className="p-8"><EmptyState icon={ListTree} title="Could not load the IVR menu" description={error} /></div>
          ) : rules.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ListTree}
                title="No menu options configured"
                description="Callers hear no menu until you add at least one option."
              />
            </div>
          ) : (
            rules.map((r) => (
              <div key={r.id} className={`flex items-center gap-4 px-5 py-3.5 ${r.is_active ? "" : "opacity-60"}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-sm font-semibold text-[var(--color-accent)]">
                  {r.key_press}
                </span>
                <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">{r.label}</span>
                <span className="text-sm text-[var(--color-text-tertiary)]">→ {describe(r)}</span>
                {r.did?.phone_number && (
                  <span className="pill bg-[var(--color-bg)] text-[10px] text-[var(--color-text-tertiary)]">
                    {r.did.phone_number}
                  </span>
                )}
                <button
                  onClick={() => remove(r)}
                  disabled={busy === r.id}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] disabled:opacity-40"
                  aria-label="Delete IVR option"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
