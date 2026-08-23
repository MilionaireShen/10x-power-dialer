import { useCallback, useEffect, useState } from "react";
import { Megaphone, Users } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import api from "../services/api";
import adminService from "../services/adminService";
import campaignService from "../services/campaignService";

export default function CallCenterBroadcast() {
  const { notify } = useToast();
  const [message, setMessage] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [history, setHistory] = useState([]);
  const [online, setOnline] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get("/admin/broadcasts");
      setHistory(res.data?.data?.broadcasts || []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Who is actually signed in right now. The count in the button used to be
  // the size of a hard-coded agent list, which is not the same number and is
  // the one a supervisor would act on.
  const loadOnline = useCallback(async () => {
    try {
      const res = await adminService.sessions();
      setOnline((res?.data?.sessions || []).length);
    } catch {
      setOnline(null);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadOnline();
    campaignService.list().then((r) => setCampaigns(r?.data || [])).catch(() => {});
  }, [loadHistory, loadOnline]);

  useEffect(() => {
    const t = setInterval(loadOnline, 15000);
    return () => clearInterval(t);
  }, [loadOnline]);

  const send = async () => {
    if (!message.trim()) {
      notify("Write a message before broadcasting.", "warning");
      return;
    }
    setSending(true);
    try {
      const res = await api.post("/admin/broadcasts", {
        message: message.trim(),
        ...(campaignId ? { campaign_id: campaignId } : {}),
      });
      // The server reports how many sessions it actually reached, including
      // when that is none — passed through rather than assumed.
      notify(res.data?.message || "Broadcast sent.", res.data?.data?.recipients ? "success" : "warning", {
        title: "Broadcast",
      });
      setMessage("");
      loadHistory();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not send the broadcast.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Call Center"
        title="Broadcast Message"
        actions={
          <span className="pill bg-[var(--color-info-tint)] text-[var(--color-info)]">
            <Users size={12} className="mr-1 inline" />
            {online === null ? "—" : `${online} signed in`}
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Compose Broadcast</h2>
          </div>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Send to</span>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field">
              <option value="">Everyone signed in</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>Agents on {c.name}</option>)}
            </select>
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Message to appear on every signed-in agent's screen…"
            className="input-field resize-none"
          />

          <button onClick={send} disabled={sending || !message.trim()} className="btn-purple mt-3 w-full disabled:opacity-40">
            {sending ? "Sending…" : "Send Broadcast"}
          </button>
          <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
            Only reaches agents who are signed in at the moment you send.
          </p>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Recent Broadcasts</h2>
          {loading ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : history.length === 0 ? (
            <EmptyState icon={Megaphone} title="No broadcasts sent yet" description="Messages you send appear here." />
          ) : (
            <div className="space-y-2">
              {history.map((b) => (
                <div key={b.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                  <p className="text-sm text-[var(--color-text-primary)]">{b.message}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                    {new Date(b.created_at).toLocaleString()} · {b.sender_name || "Unknown"} ·{" "}
                    {b.total_recipients} recipient{b.total_recipients === 1 ? "" : "s"}
                    {b.campaign?.name ? ` · ${b.campaign.name}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
