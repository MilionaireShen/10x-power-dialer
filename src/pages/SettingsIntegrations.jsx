import { useCallback, useEffect, useState } from "react";
import { Plug, CheckCircle2, Info } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import IntegrationPanel from "../components/IntegrationPanel";
import { useToast } from "../lib/ToastContext";
import { INTEGRATION_CATALOGUE, EMPTY_CONFIG } from "../lib/integrationCatalogue";
import adminService from "../services/adminService";

export default function SettingsIntegrations() {
  const { notify } = useToast();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openProvider, setOpenProvider] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await adminService.listIntegrations();
      setConnections(res?.data?.integrations || []);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load integrations.", "error");
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  // The catalogue is what the product offers; the connection state is what
  // this company has actually set up. Merged so an integration nobody has
  // touched shows as available rather than being hidden.
  const rows = INTEGRATION_CATALOGUE.map((entry) => {
    const saved = connections.find((c) => c.provider === entry.provider);
    return {
      ...entry,
      id: entry.provider,
      connected: Boolean(saved?.is_connected),
      config: saved?.config && Object.keys(saved.config).length
        ? saved.config
        : EMPTY_CONFIG[entry.type] || {},
    };
  });

  const open = rows.find((r) => r.provider === openProvider) ?? null;

  const save = async (config) => {
    try {
      await adminService.saveIntegration({ provider: open.provider, is_connected: true, config });
      notify(`${open.name} connected.`, "success");
      setOpenProvider(null);
      load();
    } catch (err) {
      // The server refuses credential-shaped config and explains why.
      notify(err?.response?.data?.message || "Could not save this integration.", "error");
    }
  };

  const disconnect = async () => {
    try {
      await adminService.saveIntegration({ provider: open.provider, is_connected: false, config: {} });
      notify(`${open.name} disconnected.`, "warning");
      setOpenProvider(null);
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not disconnect this integration.", "error");
    }
  };

  return (
    <div>
      <ScreenHeader category="Settings" title="Integrations" />
      <div className="space-y-4 p-8">
        <p className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
          <Info size={13} className="mt-px shrink-0" />
          API keys and secrets are held in the server environment, never saved here — these settings cover
          only the non-secret parts, such as which events fire and where they go.
        </p>

        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((i) => (
              <div key={i.provider} className="card">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
                      <Plug size={16} />
                    </span>
                    <p className="font-semibold text-[var(--color-text-primary)]">{i.name}</p>
                  </div>
                  {i.connected && (
                    <span className="pill border border-[var(--color-success)]/25 bg-[var(--color-success-tint)] text-[var(--color-success)]">
                      <CheckCircle2 size={11} className="mr-1 inline" /> Connected
                    </span>
                  )}
                </div>
                <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">{i.description}</p>
                <button
                  onClick={() => setOpenProvider(i.provider)}
                  className={i.connected ? "btn-outline w-full" : "btn-purple w-full"}
                >
                  {i.connected ? "Manage" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <IntegrationPanel
        integration={open}
        onClose={() => setOpenProvider(null)}
        onConnect={save}
        onDisconnect={disconnect}
      />
    </div>
  );
}
