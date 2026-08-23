import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, ShieldAlert, Phone } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import didService from "../services/didService";
import campaignService from "../services/campaignService";

// The numbers actually on the Telnyx account and in the dids table. Adding one
// means buying it, which happens through the backend — the browser never holds
// the Telnyx key.

const STATUS_TONE = {
  active: ["var(--color-success-tint)", "var(--color-success)"],
  assigned: ["var(--color-success-tint)", "var(--color-success)"],
  resting: ["var(--color-warning-tint)", "var(--color-warning)"],
  released: ["var(--color-bg)", "var(--color-text-tertiary)"],
};

export default function PhoneNumbers() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dids, setDids] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [d, c] = await Promise.all([didService.list(), campaignService.list()]);
      setDids(d?.data || []);
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

  // Buying a number is its own flow, on the DID management screen.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("add");
      setSearchParams(next, { replace: true });
      navigate("/admin/phone-system/did-management");
    }
  }, [searchParams, setSearchParams, navigate]);

  const assign = async (did, campaignId) => {
    setBusy(did.id);
    try {
      await didService.assignCampaign(did.id, { campaign_id: campaignId || null });
      notify(`${did.phone_number} reassigned.`, "success");
      load();
    } catch (err) {
      // The server refuses some pairings and says why — an inbound-enabled
      // number pointed at an outbound-only campaign, for instance.
      notify(err?.response?.data?.message || "Could not reassign this number.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title="Phone Numbers"
        actions={
          <button onClick={() => navigate("/admin/phone-system/did-management")} className="btn-purple">
            <Plus size={15} /> Add Number
          </button>
        }
      />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : error ? (
            <div className="p-8"><EmptyState icon={Phone} title="Could not load phone numbers" description={error} /></div>
          ) : dids.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Phone}
                title="No DIDs configured"
                description="Buy a number under DID Management and it appears here."
              />
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Health</th>
                  <th className="px-5 py-3 font-medium">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {dids.map((n, i) => {
                  const tone = STATUS_TONE[n.status] || STATUS_TONE.released;
                  const score = n.health_score ?? null;
                  return (
                    <tr key={n.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-[var(--color-text-primary)]">{n.phone_number}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">
                        {[n.city, n.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="pill" style={{ backgroundColor: tone[0], color: tone[1] }}>{n.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={n.campaign_id ?? ""}
                          onChange={(e) => assign(n, e.target.value)}
                          disabled={busy === n.id}
                          className="input-field w-auto disabled:opacity-50"
                        >
                          <option value="">Unassigned</option>
                          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        {score === null ? (
                          <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                            {score < 60 && <ShieldAlert size={13} className="text-[var(--color-danger)]" />}
                            {score}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">
                        {n.monthly_cost ? `$${Number(n.monthly_cost).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
