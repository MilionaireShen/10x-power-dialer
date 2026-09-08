import { useCallback, useEffect, useState } from "react";
import { Plus, CalendarCheck, CalendarOff } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import ClientPanel from "../components/ClientPanel";
import adminService from "../services/adminService";
import campaignService from "../services/campaignService";

// Reads the clients table. The table and its CRUD endpoints already existed;
// this screen was rendering a hard-coded array, so a client added here was
// never stored and never visible to anyone else.
export default function Clients() {
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const load = useCallback(
    () =>
      Promise.all([adminService.listClients(), campaignService.list().catch(() => null)])
        .then(([c, camp]) => {
          setClients(c?.data?.clients || []);
          setCampaigns(camp?.data || []);
          setError(null);
        })
        .catch((err) => setError(err?.response?.data?.message || "Could not load clients.")),
    []
  );

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const openEdit = (c) => {
    setEditingClient(c);
    setPanelOpen(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setPanelOpen(true);
  };

  // A campaign points at its client, so a client's campaigns are the ones
  // carrying its id rather than a list held on the client.
  const campaignNamesFor = (clientId) => {
    const names = campaigns.filter((c) => c.client_id === clientId).map((c) => c.name);
    if (names.length === 0) return "—";
    return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
  };

  return (
    <div>
      <ScreenHeader
        category="Campaigns"
        title="Client Calendars"
        actions={
          <button onClick={openAdd} className="btn-purple">
            <Plus size={15} /> Add New Client
          </button>
        }
      />

      <div className="p-8 space-y-6">
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Calendar</th>
                <th className="px-5 py-3 font-medium">Provider</th>
                <th className="px-5 py-3 font-medium">Campaigns / Lead Lists</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr
                  key={c.id}
                  className={`cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-accent-tint)]/40 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}
                  onClick={() => openEdit(c)}
                >
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{c.name}</td>
                  <td className="px-5 py-3.5">
                    {c.calendar_url ? (
                      <span className="pill border border-[var(--color-success)]/25 bg-[var(--color-success-tint)] text-[var(--color-success)]">
                        <CalendarCheck size={12} /> Enabled
                      </span>
                    ) : (
                      <span className="pill border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text-tertiary)]">
                        <CalendarOff size={12} /> Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.calendar_provider || "—"}</td>
                  <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{campaignNamesFor(c.id)}</td>
                  <td className="px-5 py-3.5">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="font-medium text-[var(--color-accent)] hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">Loading…</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-danger)]">{error}</td>
                </tr>
              )}
              {!loading && !error && clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-tertiary)]">
                    No clients yet — add one to configure their calendar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        editingClient={editingClient}
        campaigns={campaigns}
        onSaved={load}
      />
    </div>
  );
}
