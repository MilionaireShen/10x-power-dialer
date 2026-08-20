import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ShieldAlert } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function PhoneNumbers() {
  const { phoneNumbers, campaigns, addPhoneNumber, updatePhoneNumber } = useAppData();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newCampaign, setNewCampaign] = useState("");

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("add");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const save = () => {
    if (!newNumber.trim()) {
      notify("Enter a phone number first.", "warning");
      return;
    }
    addPhoneNumber({ number: newNumber, campaignId: newCampaign || null });
    notify(`${newNumber} added.`, "success");
    setNewNumber("");
    setNewCampaign("");
    setAddOpen(false);
  };

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title="Phone Numbers"
        actions={
          <button onClick={() => setAddOpen(true)} className="btn-purple">
            <Plus size={15} /> Add Number
          </button>
        }
      />
      <div className="p-8">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-5 py-3 font-medium">Recording</th>
                <th className="px-5 py-3 font-medium">Spam Flag</th>
              </tr>
            </thead>
            <tbody>
              {phoneNumbers.map((n, i) => (
                <tr key={n.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{n.number}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="pill"
                      style={{
                        backgroundColor: n.status === "Active" ? "var(--color-success-tint)" : "var(--color-bg)",
                        color: n.status === "Active" ? "var(--color-success)" : "var(--color-text-tertiary)",
                      }}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={n.campaignId ?? ""}
                      onChange={(e) => updatePhoneNumber(n.id, { campaignId: e.target.value || null })}
                      className="input-field w-auto"
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
                    <button
                      onClick={() => updatePhoneNumber(n.id, { recordingEnabled: !n.recordingEnabled })}
                      className={`h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${n.recordingEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                    >
                      <span className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform duration-200 ${n.recordingEnabled ? "translate-x-4" : ""}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    {n.spamFlag ? (
                      <span className="pill bg-[var(--color-danger-tint)] text-[var(--color-danger)]">
                        <ShieldAlert size={11} className="mr-1 inline" /> Flagged
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-tertiary)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SidePanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Phone Number" subtitle="Provision a new outbound number">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Phone Number</label>
            <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="(888) 555-0100" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Assign to Campaign</label>
            <select value={newCampaign} onChange={(e) => setNewCampaign(e.target.value)} className="input-field">
              <option value="">Unassigned</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={save} className="btn-purple w-full">
            Add Number
          </button>
        </div>
      </SidePanel>
    </div>
  );
}
