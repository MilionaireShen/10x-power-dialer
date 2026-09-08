import { useState } from "react";
import { Copy, RefreshCw, Loader2, CheckCircle2, XCircle, Send } from "lucide-react";
import SidePanel from "./SidePanel";
import { INTEGRATION_EVENTS, EXPORTABLE_REPORTS, generateWebhookUrl, isValidCalendarUrl } from "../data/catalogues";
import { useToast } from "../lib/ToastContext";

// One SidePanel, four field sets — which one renders is driven entirely by
// integration.type. Each field set owns its own local draft state and only
// commits to AppDataContext when Connect/Save Changes is clicked, matching
// the rest of the app's panel-form convention (e.g. ClientPanel).
export default function IntegrationPanel({ integration, onClose, onConnect, onDisconnect }) {
  if (!integration) return null;

  const FieldSet = { crm: CrmFields, webhook: WebhookFields, export: ExportFields, notify: NotifyFields }[integration.type];

  return (
    <SidePanel
      open={Boolean(integration)}
      onClose={onClose}
      title={integration.name}
      subtitle={integration.description}
      widthClass="max-w-lg"
    >
      <FieldSet
        key={integration.id}
        config={integration.config}
        connected={integration.connected}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    </SidePanel>
  );
}

function PanelFooter({ connected, onSave, onDisconnect, saveLabel = "Connect" }) {
  return (
    <div className="space-y-2 pt-2">
      <button onClick={onSave} className="btn-purple w-full py-3">
        {connected ? "Save Changes" : saveLabel}
      </button>
      {connected && (
        <button onClick={onDisconnect} className="btn-outline w-full py-2.5 text-[var(--color-danger)]">
          Disconnect
        </button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        {desc && <p className="text-xs text-[var(--color-text-tertiary)]">{desc}</p>}
      </div>
      <button onClick={onChange} className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}>
        <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function EventChecklist({ events, onToggle }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Events</p>
      <div className="space-y-1.5">
        {INTEGRATION_EVENTS.map((e) => (
          <label key={e.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]">
            <input type="checkbox" checked={events.includes(e.key)} onChange={() => onToggle(e.key)} className="accent-[var(--color-accent)]" />
            {e.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CRM — Salesforce / HubSpot: instance URL + API key, sync toggles, a
// simulated Test Connection.
// ---------------------------------------------------------------------------
function CrmFields({ config, connected, onConnect, onDisconnect }) {
  const { notify } = useToast();
  const [instanceUrl, setInstanceUrl] = useState(config.instanceUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [syncLeads, setSyncLeads] = useState(config.syncLeads);
  const [syncDispositions, setSyncDispositions] = useState(config.syncDispositions);
  const [testState, setTestState] = useState(null); // null | "checking" | { ok, host } | "fail"

  const testConnection = () => {
    if (!isValidCalendarUrl(instanceUrl) || !apiKey.trim()) {
      setTestState("fail");
      return;
    }
    setTestState("checking");
    setTimeout(() => {
      setTestState({ ok: true, host: new URL(instanceUrl).hostname });
    }, 700);
  };

  const save = () => {
    if (!isValidCalendarUrl(instanceUrl)) {
      notify("Enter a valid instance URL (must start with https://).", "warning");
      return;
    }
    if (!apiKey.trim()) {
      notify("Enter an API key before connecting.", "warning");
      return;
    }
    onConnect({ instanceUrl, apiKey, syncLeads, syncDispositions });
  };

  return (
    <div className="space-y-5">
      <Field label="Instance URL">
        <input
          value={instanceUrl}
          onChange={(e) => {
            setInstanceUrl(e.target.value);
            setTestState(null);
          }}
          placeholder="https://yourcompany.my.salesforce.com"
          className="input-field"
        />
      </Field>

      <Field label="API Key">
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTestState(null);
            }}
            placeholder="sk_live_..."
            className="input-field"
          />
          <button type="button" onClick={testConnection} className="btn-gray shrink-0 px-3 text-sm">
            Test
          </button>
        </div>
        {testState === "checking" && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
            <Loader2 size={12} className="animate-spin" /> Checking connection…
          </p>
        )}
        {testState === "fail" && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-danger)]">
            <XCircle size={12} /> Enter a valid instance URL and API key first.
          </p>
        )}
        {testState && testState.ok && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-success)]">
            <CheckCircle2 size={12} /> Connected to {testState.host}.
          </p>
        )}
      </Field>

      <ToggleRow label="Sync qualified leads" checked={syncLeads} onChange={() => setSyncLeads((v) => !v)} />
      <ToggleRow label="Sync dispositions" checked={syncDispositions} onChange={() => setSyncDispositions((v) => !v)} />

      <PanelFooter connected={connected} onSave={save} onDisconnect={onDisconnect} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Webhook — Zapier: a generated webhook URL Zapier polls, plus which events
// fire it.
// ---------------------------------------------------------------------------
function WebhookFields({ config, connected, onConnect, onDisconnect }) {
  const { notify } = useToast();
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl);
  const [events, setEvents] = useState(config.events);
  const [testPayload, setTestPayload] = useState(null);
  const [sending, setSending] = useState(false);

  const toggleEvent = (key) => setEvents((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const regenerate = () => {
    setWebhookUrl(generateWebhookUrl());
    notify("New webhook URL generated — any Zaps using the old one will stop working.", "warning");
  };

  const copyUrl = () => {
    navigator.clipboard?.writeText(webhookUrl);
    notify("Webhook URL copied.", "success");
  };

  const sendTestEvent = () => {
    setSending(true);
    setTestPayload(null);
    setTimeout(() => {
      setSending(false);
      setTestPayload({
        event: events[0] ?? "booked_appointment",
        lead_name: "Patricia Alvarado",
        campaign: "Solar Homeowner Outreach",
        agent: "Jordan Blake",
        timestamp: new Date().toISOString(),
      });
      notify("Test event sent to your webhook URL.", "success");
    }, 700);
  };

  const save = () => {
    if (!webhookUrl) {
      notify("Generate a webhook URL first.", "warning");
      return;
    }
    if (events.length === 0) {
      notify("Select at least one event to trigger this webhook.", "warning");
      return;
    }
    onConnect({ webhookUrl, events });
  };

  return (
    <div className="space-y-5">
      <Field label="Webhook URL">
        {webhookUrl ? (
          <div className="flex gap-2">
            <input value={webhookUrl} readOnly className="input-field bg-[var(--color-bg)] font-mono text-xs" />
            <button type="button" onClick={copyUrl} className="btn-gray shrink-0 px-3" aria-label="Copy webhook URL">
              <Copy size={14} />
            </button>
            <button type="button" onClick={regenerate} className="btn-gray shrink-0 px-3" aria-label="Regenerate webhook URL">
              <RefreshCw size={14} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setWebhookUrl(generateWebhookUrl())} className="btn-purple w-full">
            Generate Webhook URL
          </button>
        )}
        <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">Paste this as the trigger URL in your Zap.</p>
      </Field>

      <EventChecklist events={events} onToggle={toggleEvent} />

      <div>
        <button type="button" onClick={sendTestEvent} disabled={!webhookUrl || sending} className="btn-gray w-full disabled:opacity-40">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send Test Event
        </button>
        {testPayload && (
          <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--color-bg)] p-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
            {JSON.stringify(testPayload, null, 2)}
          </pre>
        )}
      </div>

      <PanelFooter connected={connected} onSave={save} onDisconnect={onDisconnect} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export — Google Sheets: OAuth-style account connect, a target sheet, and
// what to export.
// ---------------------------------------------------------------------------
function ExportFields({ config, connected, onConnect, onDisconnect }) {
  const { notify } = useToast();
  const [accountEmail, setAccountEmail] = useState(config.accountEmail);
  const [sheetUrl, setSheetUrl] = useState(config.sheetUrl);
  const [report, setReport] = useState(config.report);
  const [autoExport, setAutoExport] = useState(config.autoExport);
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [exporting, setExporting] = useState(false);

  const connectAccount = () => {
    setConnectingAccount(true);
    setTimeout(() => {
      setConnectingAccount(false);
      setAccountEmail("reports@10xpowerdialer.com");
      notify("Google account connected.", "success");
    }, 800);
  };

  const sendTestExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      notify(`${report} exported — 142 rows written to your sheet.`, "success");
    }, 700);
  };

  const save = () => {
    if (!accountEmail) {
      notify("Connect a Google account first.", "warning");
      return;
    }
    if (!isValidCalendarUrl(sheetUrl)) {
      notify("Enter a valid Google Sheets URL (must start with https://).", "warning");
      return;
    }
    onConnect({ accountEmail, sheetUrl, report, autoExport });
  };

  return (
    <div className="space-y-5">
      <Field label="Google Account">
        {accountEmail ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-tint)] px-3 py-2.5 text-sm text-[var(--color-success)]">
            <CheckCircle2 size={14} /> Connected as {accountEmail}
          </div>
        ) : (
          <button type="button" onClick={connectAccount} disabled={connectingAccount} className="btn-purple w-full disabled:opacity-60">
            {connectingAccount ? <Loader2 size={14} className="animate-spin" /> : null}
            {connectingAccount ? "Redirecting to Google…" : "Connect Google Account"}
          </button>
        )}
      </Field>

      <Field label="Sheet URL">
        <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="input-field" />
      </Field>

      <Field label="Report to Export">
        <select value={report} onChange={(e) => setReport(e.target.value)} className="input-field">
          {EXPORTABLE_REPORTS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>

      <ToggleRow label="Export automatically every day" checked={autoExport} onChange={() => setAutoExport((v) => !v)} />

      <button type="button" onClick={sendTestExport} disabled={!accountEmail || !sheetUrl || exporting} className="btn-gray w-full disabled:opacity-40">
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Send Test Export
      </button>

      <PanelFooter connected={connected} onSave={save} onDisconnect={onDisconnect} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notify — Slack: OAuth-style workspace connect, a channel, and which events
// post there.
// ---------------------------------------------------------------------------
function NotifyFields({ config, connected, onConnect, onDisconnect }) {
  const { notify } = useToast();
  const [workspace, setWorkspace] = useState(config.workspace);
  const [channel, setChannel] = useState(config.channel);
  const [events, setEvents] = useState(config.events);
  const [connectingWorkspace, setConnectingWorkspace] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentPreview, setSentPreview] = useState(false);

  const toggleEvent = (key) => setEvents((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const connectWorkspace = () => {
    setConnectingWorkspace(true);
    setTimeout(() => {
      setConnectingWorkspace(false);
      setWorkspace("10X Power Dialer Workspace");
      notify("Slack workspace connected.", "success");
    }, 800);
  };

  const sendTestMessage = () => {
    setSending(true);
    setSentPreview(false);
    setTimeout(() => {
      setSending(false);
      setSentPreview(true);
      notify(`Test message sent to ${channel}.`, "success");
    }, 700);
  };

  const save = () => {
    if (!workspace) {
      notify("Connect to Slack first.", "warning");
      return;
    }
    if (!channel.trim().startsWith("#")) {
      notify("Channel should look like #channel-name.", "warning");
      return;
    }
    onConnect({ workspace, channel, events });
  };

  return (
    <div className="space-y-5">
      <Field label="Slack Workspace">
        {workspace ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-tint)] px-3 py-2.5 text-sm text-[var(--color-success)]">
            <CheckCircle2 size={14} /> Connected to {workspace}
          </div>
        ) : (
          <button type="button" onClick={connectWorkspace} disabled={connectingWorkspace} className="btn-purple w-full disabled:opacity-60">
            {connectingWorkspace ? <Loader2 size={14} className="animate-spin" /> : null}
            {connectingWorkspace ? "Redirecting to Slack…" : "Connect to Slack"}
          </button>
        )}
      </Field>

      <Field label="Channel">
        <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="#booked-appointments" className="input-field" />
      </Field>

      <EventChecklist events={events} onToggle={toggleEvent} />

      <div>
        <button type="button" onClick={sendTestMessage} disabled={!workspace || sending} className="btn-gray w-full disabled:opacity-40">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send Test Message
        </button>
        {sentPreview && (
          <div className="mt-2 rounded-lg border-l-4 border-[var(--color-accent)] bg-[var(--color-bg)] p-3 text-sm">
            <p className="font-semibold text-[var(--color-text-primary)]">10X Power Dialer</p>
            <p className="text-[var(--color-text-secondary)]">🎉 New booked appointment — Patricia Alvarado, Solar Homeowner Outreach, booked by Jordan Blake.</p>
          </div>
        )}
      </div>

      <PanelFooter connected={connected} onSave={save} onDisconnect={onDisconnect} />
    </div>
  );
}
