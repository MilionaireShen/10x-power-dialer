import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Plus } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import BuyDidModal from "../components/BuyDidModal";
import { useToast } from "../lib/ToastContext";
import didService from "../services/didService";
import campaignService from "../services/campaignService";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// The dids table isn't guaranteed to use these exact column names yet (no
// backend response has been observed), so this reads several plausible
// keys and falls back to a clearly-empty placeholder rather than inventing
// a number.
function normalizeDid(d) {
  return {
    id: d.id,
    phoneNumber: d.phone_number ?? d.number ?? "—",
    state: d.state ?? d.region ?? "—",
    healthScore: d.health_score ?? d.score ?? null,
    status: d.status ?? (d.is_active === false ? "Inactive" : "Active"),
    monthlyCost: d.monthly_cost ?? d.cost_monthly ?? 0,
    campaignId: d.campaign_id ?? null,
    campaignName: d.campaign_name ?? null,
  };
}

export default function DIDManagement() {
  const { notify } = useToast();
  const navigate = useNavigate();

  const [dids, setDids] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyOpen, setBuyOpen] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [stateTarget, setStateTarget] = useState(null);
  const [releaseTarget, setReleaseTarget] = useState(null);

  const loadDids = useCallback(() => {
    setLoading(true);
    didService
      .list()
      .then((res) => setDids((res.data || []).map(normalizeDid)))
      .catch(() => setDids([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDids();
    campaignService
      .list()
      .then((res) => setCampaigns(res.data || []))
      .catch(() => setCampaigns([]));
  }, [loadDids]);

  const handleAction = (did, action) => {
    setMenuOpenFor(null);
    if (action === "report") navigate(`/admin/phone-system/did/${did.id}`);
    if (action === "assign") setAssignTarget(did);
    if (action === "state") setStateTarget(did);
    if (action === "deactivate") {
      didService
        .deactivate(did.id)
        .then(() => {
          notify(`${did.phoneNumber} deactivated.`, "warning");
          loadDids();
        })
        .catch((err) => notify(err?.message || "Could not deactivate this number.", "error"));
    }
    if (action === "release") setReleaseTarget(did);
  };

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title="DID Management"
        actions={
          <button onClick={() => setBuyOpen(true)} className="btn-purple">
            <Plus size={15} /> Buy DID
          </button>
        }
      />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-4 py-3 font-medium">Phone Number</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Health Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Monthly Cost</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-tertiary)]">
                    Loading DIDs…
                  </td>
                </tr>
              )}
              {!loading && dids.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-tertiary)]">
                    No DIDs added yet
                  </td>
                </tr>
              )}
              {!loading &&
                dids.map((did, i) => (
                  <tr key={did.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-[var(--color-text-primary)]">
                      <button onClick={() => navigate(`/admin/phone-system/did/${did.id}`)} className="hover:underline">
                        {did.phoneNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-text-secondary)]">{did.state}</td>
                    <td className="px-4 py-3.5 text-[var(--color-text-secondary)]">{did.healthScore != null ? `${did.healthScore}/100` : "—"}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className="pill"
                        style={{
                          backgroundColor: did.status === "Active" ? "var(--color-success-tint)" : "var(--color-bg)",
                          color: did.status === "Active" ? "var(--color-success)" : "var(--color-text-tertiary)",
                        }}
                      >
                        {did.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-text-secondary)]">${Number(did.monthlyCost).toFixed(2)}</td>
                    <td className="px-4 py-3.5">
                      <DidActionMenu open={menuOpenFor === did.id} onToggle={() => setMenuOpenFor(menuOpenFor === did.id ? null : did.id)} onAction={(a) => handleAction(did, a)} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <BuyDidModal open={buyOpen} onClose={() => setBuyOpen(false)} onPurchased={loadDids} />

      <AssignCampaignPanel
        did={assignTarget}
        campaigns={campaigns}
        onClose={() => setAssignTarget(null)}
        onSave={(campaignId) => {
          didService
            .assignCampaign(assignTarget.id, campaignId || null)
            .then(() => {
              notify(`${assignTarget.phoneNumber} reassigned.`, "success");
              setAssignTarget(null);
              loadDids();
            })
            .catch((err) => notify(err?.message || "Could not reassign this number.", "error"));
        }}
      />

      <SetStatePanel
        did={stateTarget}
        onClose={() => setStateTarget(null)}
        onSave={(state) => {
          didService
            .assignState({ did_id: stateTarget.id, state })
            .then(() => {
              notify(`${stateTarget.phoneNumber} set to ${state}.`, "success");
              setStateTarget(null);
              loadDids();
            })
            .catch((err) => notify(err?.message || "Could not update the state for this number.", "error"));
        }}
      />

      <ReleasePanel
        did={releaseTarget}
        onClose={() => setReleaseTarget(null)}
        onConfirm={() => {
          didService
            .release(releaseTarget.id)
            .then(() => {
              notify(`${releaseTarget.phoneNumber} released.`, "warning");
              setReleaseTarget(null);
              loadDids();
            })
            .catch((err) => notify(err?.message || "Could not release this number.", "error"));
        }}
      />
    </div>
  );
}

function DidActionMenu({ open, onToggle, onAction }) {
  return (
    <div className="relative inline-block">
      <button onClick={onToggle} className="rounded-full p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)] transition-colors">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
          <MenuItem label="Assign to Campaign" onClick={() => onAction("assign")} />
          <MenuItem label="Set State" onClick={() => onAction("state")} />
          <MenuItem label="Deactivate" onClick={() => onAction("deactivate")} />
          <MenuItem label="Release Number" danger onClick={() => onAction("release")} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg)] ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}
    >
      {label}
    </button>
  );
}

function AssignCampaignPanel({ did, campaigns, onClose, onSave }) {
  return (
    <SidePanel open={Boolean(did)} onClose={onClose} title={did ? `Assign ${did.phoneNumber}` : ""} subtitle="Choose which campaign dials from this number">
      {did && <AssignCampaignForm did={did} campaigns={campaigns} onSave={onSave} />}
    </SidePanel>
  );
}

function AssignCampaignForm({ did, campaigns, onSave }) {
  const [campaignId, setCampaignId] = useState(did.campaignId ?? "");
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Campaign</label>
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field">
          <option value="">Unassigned</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button onClick={() => onSave(campaignId)} className="btn-purple w-full">
        Save Assignment
      </button>
    </div>
  );
}

function SetStatePanel({ did, onClose, onSave }) {
  return (
    <SidePanel open={Boolean(did)} onClose={onClose} title={did ? `Set State — ${did.phoneNumber}` : ""} subtitle="Used for local-presence dialing rules">
      {did && <SetStateForm did={did} onSave={onSave} />}
    </SidePanel>
  );
}

function SetStateForm({ did, onSave }) {
  const [state, setState] = useState(did.state !== "—" ? did.state : US_STATES[0]);
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">State</label>
        <select value={state} onChange={(e) => setState(e.target.value)} className="input-field">
          {US_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <button onClick={() => onSave(state)} className="btn-purple w-full">
        Save State
      </button>
    </div>
  );
}

function ReleasePanel({ did, onClose, onConfirm }) {
  return (
    <SidePanel open={Boolean(did)} onClose={onClose} title={did ? `Release ${did.phoneNumber}` : ""} subtitle="This cannot be undone">
      {did && (
        <div className="space-y-4">
          <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-tint)] px-4 py-3 text-sm font-medium text-[var(--color-danger)]">
            This will permanently release this number. Are you sure?
          </p>
          <button onClick={onConfirm} className="btn-danger w-full">
            Release Number
          </button>
        </div>
      )}
    </SidePanel>
  );
}
