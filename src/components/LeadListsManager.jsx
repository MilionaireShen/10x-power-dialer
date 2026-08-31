import { useCallback, useEffect, useState } from "react";
import { ListChecks, Trash2 } from "lucide-react";
import EmptyState from "./EmptyState";
import { useToast } from "../lib/ToastContext";
import leadService from "../services/leadService";
import campaignService from "../services/campaignService";

const HEALTH_COLOR = {
  fresh: "var(--color-success)",
  tired: "var(--color-warning)",
  exhausted: "var(--color-danger)",
  recycled: "var(--color-info)",
};

function fmt(n) {
  return Number(n || 0).toLocaleString();
}

// The Lead Lists table + per-list campaign assignment. Rendered from both
// Leads → Lead Lists and Campaigns → Lead Lists — same component, same data,
// so the two screens can never disagree.
export default function LeadListsManager() {
  const { notify } = useToast();
  const [lists, setLists] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [listsRes, campaignsRes] = await Promise.all([leadService.listLists(), campaignService.list()]);
      setLists(listsRes.data || []);
      setCampaigns((campaignsRes.data || []).filter((c) => c.status !== "completed"));
    } catch (err) {
      notify(err?.message || "Could not load lead lists.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (list, campaignId) => {
    setBusyId(list.id);
    try {
      const res = await leadService.assignList(list.id, campaignId || null);
      notify(res.message || "Assignment updated.", "success", { title: "Lead List Updated" });
      await load();
    } catch (err) {
      notify(err?.message || "Could not update the assignment.", "error", { title: "Assignment Failed" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (list) => {
    const count = list.lead_count ?? list.total_leads ?? 0;
    if (!window.confirm(`Delete "${list.name}" and its ${fmt(count)} lead${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBusyId(list.id);
    try {
      const res = await leadService.deleteList(list.id);
      notify(res.message || "Lead list deleted.", "success");
      await load();
    } catch (err) {
      notify(err?.message || "Could not delete the lead list.", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="card text-sm text-[var(--color-text-tertiary)]">Loading lead lists…</div>;
  }

  if (lists.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={ListChecks}
          title="No lead lists yet"
          description="Upload a lead file from Leads → Upload Leads. Each upload becomes its own Lead List you can assign to a campaign here."
        />
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
            <th className="px-5 py-3 font-medium">Lead List</th>
            <th className="px-5 py-3 font-medium">Total Leads</th>
            <th className="px-5 py-3 font-medium">Dialable</th>
            <th className="px-5 py-3 font-medium">Uploaded</th>
            <th className="px-5 py-3 font-medium">Health</th>
            <th className="px-5 py-3 font-medium">Assigned Campaign</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {lists.map((l, i) => {
            const assigned = Boolean(l.assigned_campaign);
            const healthColor = HEALTH_COLOR[l.health_status] || "var(--color-text-tertiary)";
            return (
              <tr key={l.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{l.name}</td>
                <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{fmt(l.lead_count ?? l.total_leads)}</td>
                <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{fmt(l.pending_count)}</td>
                <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">
                  {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className="pill capitalize"
                    style={{ backgroundColor: `color-mix(in srgb, ${healthColor} 14%, white)`, color: healthColor }}
                  >
                    {l.health_status || "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <select
                    value={l.assigned_campaign?.id || ""}
                    disabled={busyId === l.id}
                    onChange={(e) => assign(l, e.target.value)}
                    className="input-field w-auto min-w-[180px] py-1.5 text-sm disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className="pill"
                    style={{
                      backgroundColor: assigned ? "var(--color-success-tint)" : "var(--color-bg)",
                      color: assigned ? "var(--color-success)" : "var(--color-text-tertiary)",
                    }}
                  >
                    {assigned ? "Assigned" : "Unassigned"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => remove(l)}
                    disabled={busyId === l.id}
                    title="Delete lead list"
                    aria-label="Delete lead list"
                    className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-danger-tint)] hover:text-[var(--color-danger)] disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
