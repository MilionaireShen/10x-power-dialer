import { useState } from "react";
import { Plug, CheckCircle2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import IntegrationPanel from "../components/IntegrationPanel";
import { useAppData } from "../lib/AppDataContext";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../lib/ToastContext";

export default function SettingsIntegrations() {
  const { integrations, connectIntegration, disconnectIntegration } = useAppData();
  const { user } = useAuth();
  const { notify } = useToast();
  const [openId, setOpenId] = useState(null);

  const openIntegration = integrations.find((i) => i.id === openId) ?? null;

  return (
    <div>
      <ScreenHeader category="Settings" title="Integrations" />
      <div className="p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {integrations.map((i) => (
            <div key={i.id} className="card">
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
              <button onClick={() => setOpenId(i.id)} className={i.connected ? "btn-outline w-full" : "btn-purple w-full"}>
                {i.connected ? "Manage" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <IntegrationPanel
        integration={openIntegration}
        onClose={() => setOpenId(null)}
        onConnect={(config) => {
          connectIntegration(user.name, openId, config);
          notify(`${openIntegration.name} connected.`, "success");
          setOpenId(null);
        }}
        onDisconnect={() => {
          disconnectIntegration(user.name, openId);
          notify(`${openIntegration.name} disconnected.`, "warning");
          setOpenId(null);
        }}
      />
    </div>
  );
}
