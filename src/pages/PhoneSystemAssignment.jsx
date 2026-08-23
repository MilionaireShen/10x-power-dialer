import { useCallback, useEffect, useState } from "react";
import { Phone, RefreshCw, History } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";
import campaignService from "../services/campaignService";

// Real DIDs and their real assignments. Changing one writes to the database
// and records the move, so the reassignment survives a refresh and can be
// explained later.

function when(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PhoneSystemAssignment() {
  const { notify } = useToast();
  const [numbers, setNumbers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [showHistory, setShowHistory] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [n, c] = await Promise.all([
        adminService.phoneNumbers(),
        campaignService.list(),
      ]);
      setNumbers(n?.data?.numbers || []);
      setCampaigns(c?.data || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load phone numbers.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const assign = async (did, campaignId) => {
    setBusy(did.id);
    try {
      const res = await adminService.assignNumber(did.id, { campaign_id: campaignId || null });
      notify(res?.message || "Assignment saved.", "success");
      // Reloaded rather than patched locally, so what is on screen is what the
      // database now holds.
      load();
    } catch (err) {
      // The server refuses some pairings — an inbound number pointed at an
      // outbound-only campaign — and explains why.
      notify(err?.response?.data?.message || "Could not reassign this number.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title="Number Assignment"
        actions={
          <button onClick={load} className="btn-outline py-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
      <div className="p-8">
        <div className="card divide-y divide-[var(--color-border)] p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : error ? (
            <div className="p-8"><EmptyState icon={Phone} title="Could not load numbers" description={error} /></div>
          ) : numbers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Phone}
                title="No DIDs configured"
                description="Buy a number under DID Management and it appears here for assignment."
              />
            </div>
          ) : (
            numbers.map((n) => (
              <div key={n.id}>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="w-44 shrink-0">
                    <p className="font-mono text-sm font-medium text-[var(--color-text-primary)]">{n.phone_number}</p>
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                      {[n.city, n.state].filter(Boolean).join(", ") || n.country_code || "—"}
                      {n.carrier ? ` · ${n.carrier}` : ""}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {n.campaign?.name || <span className="text-[var(--color-text-tertiary)]">Currently unassigned</span>}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                      {n.assigned_at ? `Assigned ${when(n.assigned_at)}` : "Available"}
                      {n.inbound_enabled ? " · takes inbound" : ""}
                      {n.status ? ` · ${n.status}` : ""}
                    </p>
                  </div>

                  <select
                    value={n.campaign_id ?? ""}
                    onChange={(e) => assign(n, e.target.value)}
                    disabled={busy === n.id}
                    className="input-field w-64 disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  {n.assignment_history?.length > 0 && (
                    <button
                      onClick={() => setShowHistory(showHistory === n.id ? null : n.id)}
                      title="Assignment history"
                      className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)]"
                    >
                      <History size={15} />
                    </button>
                  )}
                </div>

                {/* Where this number has been. A number's reputation is earned
                    under whatever campaign was using it, so a sudden change in
                    its score is often explained by a move. */}
                {showHistory === n.id && (
                  <div className="bg-[var(--color-bg)] px-5 py-3">
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
                      Assignment history
                    </p>
                    <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                      {n.assignment_history.map((h) => (
                        <li key={h.id} className="flex justify-between gap-3">
                          <span>{h.to_campaign?.name || "Unassigned"}</span>
                          <span className="text-[var(--color-text-tertiary)]">{when(h.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
