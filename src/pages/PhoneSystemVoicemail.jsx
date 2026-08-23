import { useCallback, useEffect, useState } from "react";
import { Voicemail, Info } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";

// What actually happens to an unanswered inbound call is decided per campaign
// by after_hours_action, which the inbound router reads. These are the company
// defaults plus the per-campaign settings that override them, so the screen
// shows what is really in force rather than one global switch that governs
// nothing.

const ACTIONS = [
  { value: "voicemail", label: "Send to voicemail" },
  { value: "message", label: "Play a message and hang up" },
  { value: "forward", label: "Forward to another number" },
  { value: "hangup", label: "Hang up" },
];

export default function PhoneSystemVoicemail() {
  const { notify } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminService.getVoicemailSettings();
      setData(res?.data || null);
      setEnabled(res?.data?.company?.enabled !== false);
      setGreeting(res?.data?.company?.greeting || "");
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load voicemail settings.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const saveCompany = async () => {
    setSaving(true);
    try {
      await adminService.saveVoicemailSettings({ company: { enabled, greeting } });
      notify("Voicemail settings saved.", "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save voicemail settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveCampaign = async (campaign, patch) => {
    setBusy(campaign.id);
    try {
      await adminService.saveVoicemailSettings({ campaign_id: campaign.id, ...patch });
      notify(`After-hours handling saved for ${campaign.name}.`, "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save that campaign.", "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div>
        <ScreenHeader category="Phone System" title="Voicemail Settings" />
        <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <ScreenHeader category="Phone System" title="Voicemail Settings" />
        <div className="p-8">
          <EmptyState icon={Voicemail} title="Could not load voicemail settings" description={error || "No data returned."} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title="Voicemail Settings"
        actions={
          <button onClick={saveCompany} disabled={saving} className="btn-purple disabled:opacity-40">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        }
      />
      <div className="space-y-6 p-8">
        <p className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
          <Info size={13} className="mt-px shrink-0" />
          {data.note}
        </p>

        <div className="card max-w-xl space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Voicemail</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Unanswered inbound calls roll to voicemail</p>
            </div>
            <button
              onClick={() => setEnabled((v) => !v)}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
            >
              <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${enabled ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Default Greeting
            </label>
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={4}
              placeholder="Thanks for calling — we're unable to take your call right now…"
              className="input-field resize-none"
            />
          </div>

          {/* Transcription is not implemented anywhere in the pipeline, so it
              is stated as unavailable rather than offered as a switch that
              would do nothing. */}
          {!data.company.transcription_available && (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Voicemail transcription is not available on this platform yet.
            </p>
          )}
        </div>

        <div className="card p-0">
          <h3 className="border-b border-[var(--color-border)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            After-hours handling, by campaign
          </h3>
          {data.campaigns.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--color-text-tertiary)]">No campaigns yet.</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {data.campaigns.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text-primary)]">{c.name}</span>
                  <select
                    value={c.after_hours_action || "voicemail"}
                    onChange={(e) => saveCampaign(c, { after_hours_action: e.target.value })}
                    disabled={busy === c.id}
                    className="input-field w-56 py-2 text-sm disabled:opacity-50"
                  >
                    {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  {c.after_hours_action === "forward" && (
                    <input
                      defaultValue={c.after_hours_forward_number || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (c.after_hours_forward_number || "")) {
                          saveCampaign(c, { after_hours_forward_number: e.target.value });
                        }
                      }}
                      placeholder="Forward to…"
                      className="input-field w-48 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
