// Static configuration and pure helpers used by the admin screens.
//
// Split out of mockData.js, which mixed two very different things: invented
// records that stood in for a backend, and genuine constants like the list of
// field types or the permission catalogue's shape. The invented records are
// gone — every screen reads its data from the API now — and what remains here
// is the part that was never data in the first place.
//
// Nothing in this file describes a campaign, a client, a number or a person.
// If something like that is needed, it comes from the server.

export function initials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}





// Full permission catalog for the customizable Manager role — organized
// exactly per the sections in the spec.

export const PERMISSION_SECTIONS = [
  {
    key: "monitoring",
    label: "Call Monitoring",
    permissions: [
      { key: "listen_live", label: "Listen to live calls" },
      { key: "whisper_agents", label: "Whisper to agents" },
      { key: "barge_calls", label: "Barge into calls" },
      { key: "view_agent_monitor", label: "View agent monitor board" },
    ],
  },
  {
    key: "recordings",
    label: "Recordings",
    permissions: [
      { key: "listen_recordings", label: "Listen to recorded calls" },
      { key: "download_recordings", label: "Download recorded calls" },
      { key: "delete_recordings", label: "Delete recorded calls" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Metrics",
    permissions: [
      { key: "view_campaign_reports", label: "View campaign reports" },
      { key: "view_agent_reports", label: "View agent performance reports" },
      { key: "view_conversion_reports", label: "View conversion reports" },
      { key: "view_duration_reports", label: "View call duration reports" },
      { key: "export_csv", label: "Export reports to CSV" },
      { key: "export_pdf", label: "Export reports to PDF" },
      { key: "view_financial_metrics", label: "View financial/revenue metrics" },
      { key: "view_leadlist_performance", label: "View lead list performance" },
    ],
  },
  {
    key: "campaigns",
    label: "Campaign Management",
    permissions: [
      { key: "create_campaigns", label: "Create new campaigns" },
      { key: "edit_campaigns", label: "Edit existing campaigns" },
      { key: "pause_resume_campaigns", label: "Pause and resume campaigns" },
      { key: "change_dialing_mode", label: "Change dialing mode" },
      { key: "assign_agents_campaigns", label: "Assign agents to campaigns" },
      { key: "upload_lead_lists", label: "Upload lead lists" },
      { key: "manage_dnc", label: "Manage DNC list" },
    ],
  },
  {
    key: "agents",
    label: "Agent Management",
    permissions: [
      { key: "view_agent_profiles", label: "View agent profiles" },
      { key: "add_agents", label: "Add new agents" },
      { key: "edit_agents", label: "Edit agent information" },
      { key: "deactivate_agents", label: "Deactivate agents" },
      { key: "force_logout_agents", label: "Force logout agents" },
      { key: "force_status_change", label: "Change agent status remotely" },
      { key: "view_callback_queue", label: "View agent callback queue" },
      { key: "send_broadcast", label: "Send broadcast messages" },
    ],
  },
  {
    key: "sms",
    label: "SMS",
    // These keys are the user_permissions column names, which is what the JWT
    // carries and what the server checks. The rest of this list still uses the
    // older short names, so a manager's SMS access is the only part of the
    // checklist that is genuinely enforced end to end today.
    permissions: [
      { key: "can_view_sms_conversations", label: "View SMS conversations" },
      { key: "can_send_sms", label: "Send SMS" },
      { key: "can_view_agent_sms", label: "View agent SMS" },
      { key: "can_view_campaign_sms", label: "View campaign SMS" },
      { key: "can_view_sms_delivery_status", label: "View SMS delivery status" },
      { key: "can_view_appointment_confirmations", label: "View appointment confirmations" },
      { key: "can_export_sms_history", label: "Export SMS history" },
      { key: "can_enable_sms", label: "Enable SMS on campaigns" },
      { key: "can_edit_sms_templates", label: "Edit SMS templates" },
      { key: "can_view_sms_logs", label: "View SMS delivery reports" },
    ],
  },
  {
    key: "training",
    label: "Training & Resources",
    permissions: [{ key: "view_knowledge_center", label: "View Knowledge Center" }],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_SECTIONS.flatMap((s) => s.permissions.map((p) => p.key));

export function emptyPermissions() {
  return Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false]));
}

// A realistic mixed grant — enough access to demonstrate a genuinely
// restricted nav/route experience, not all-or-nothing.

export const CALENDAR_PROVIDERS = ["Calendly", "Acuity Scheduling", "Google Calendar", "Custom / Other"];

export function isValidCalendarUrl(url) {
  if (!url || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

// A "Client" is the business the lead ultimately belongs to — one client
// can span several campaigns/lead lists, and each client owns exactly one
// calendar so an agent's screen can never show the wrong company's
// availability. Deliberately kept separate from Campaign (rather than
// bolting calendar fields onto Campaign) since a client can own more than
// one campaign, and the admin needs to manage the calendar independent of
// any single campaign's lifecycle.

export const DEFAULT_LEAD_FIELDS = [
  { id: "fullName", label: "Full Name", section: "contact" },
  { id: "phone", label: "Phone Number", section: "contact" },
  { id: "email", label: "Email Address", section: "contact" },
  { id: "street", label: "Street Address", section: "address", placeholder: "123 Main Street" },
  { id: "city", label: "City", section: "address" },
  { id: "state", label: "State", section: "address" },
  { id: "zip", label: "Zip Code", section: "address" },
];

export const FIELD_TYPES = ["Text", "Number", "Dropdown", "Yes or No", "Date"];

// Admin-created custom fields — shared/mutable at runtime via AppDataContext.

const ROLE_DESCRIPTIONS = {
  agent: "Fixed permissions — can only dial their own assigned campaigns and see their own stats.",
  manager: "Fully customizable — pick exactly which admin capabilities this person gets.",
  admin: "Full access to everything except super admin company/global management.",
  super_admin: "Full access to everything, including all company management and global reports.",
};

export const ROLE_CARDS = [
  { key: "agent", label: "Agent", description: ROLE_DESCRIPTIONS.agent },
  { key: "manager", label: "Manager", description: ROLE_DESCRIPTIONS.manager },
  { key: "admin", label: "Admin", description: ROLE_DESCRIPTIONS.admin },
  { key: "super_admin", label: "Super Admin", description: ROLE_DESCRIPTIONS.super_admin },
];

function fakeIp(seed) {
  return `${24 + (seed % 40)}.${18 + ((seed * 3) % 60)}.${100 + ((seed * 7) % 120)}.${10 + ((seed * 11) % 200)}`;
}

// Seeded login history per user — merged with the live shared activity log
// on the Edit User → Activity Log tab.

export const INTEGRATION_EVENTS = [
  { key: "booked_appointment", label: "Booked Appointment" },
  { key: "callback_scheduled", label: "Callback Scheduled" },
  { key: "dnc_request", label: "DNC Request Received" },
  { key: "campaign_paused", label: "Campaign Paused" },
  { key: "did_critical", label: "DID Score Critical" },
  { key: "did_auto_paused", label: "DID Auto-Paused" },
];

export const EXPORTABLE_REPORTS = ["Agent Performance", "Campaign Reports", "Call Logs", "Disposition Reports"];

export function generateWebhookUrl() {
  return `https://hooks.10xpowerdialer.com/zapier/${Math.random().toString(36).slice(2, 10)}`;
}

// `type` drives which fields IntegrationPanel renders:
//   crm      — instance URL + API key, sync toggles, Test Connection
//   webhook  — generated webhook URL, event checklist, Send Test Event
//   export   — OAuth-style account connect, sheet URL, report + auto-export
//   notify   — OAuth-style workspace connect, channel, event checklist