import { useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";

export default function PhoneSystemVoicemail() {
  const { notify } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [transcription, setTranscription] = useState(true);
  const [greeting, setGreeting] = useState(
    "Thanks for calling — we're unable to take your call right now. Please leave your name and number and we'll get back to you shortly."
  );

  return (
    <div>
      <ScreenHeader
        category="Phone System"
        title="Voicemail Settings"
        actions={
          <button onClick={() => notify("Voicemail settings saved.", "success")} className="btn-purple">
            Save Changes
          </button>
        }
      />
      <div className="p-8">
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

          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Voicemail Transcription</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Emails a text transcript alongside the audio file</p>
            </div>
            <button
              onClick={() => setTranscription((v) => !v)}
              disabled={!enabled}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-40 ${transcription ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
            >
              <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${transcription ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Voicemail Greeting</label>
            <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={4} disabled={!enabled} className="input-field resize-none disabled:opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
