// Realistic placeholder data for the 10X Power Dialer demo.


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
export const DEFAULT_MANAGER_PERMISSIONS = {
  ...emptyPermissions(),
  listen_live: true,
  whisper_agents: true,
  view_agent_monitor: true,
  listen_recordings: true,
  view_campaign_reports: true,
  view_agent_reports: true,
  export_csv: true,
  view_agent_profiles: true,
  force_status_change: true,
  view_callback_queue: true,
  send_broadcast: true,
  view_knowledge_center: true,
};


function seedRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const rand = seedRandom(42);

const QUEUE_NAMES = ["Queue A", "Queue B", "Queue C"];
const LEAD_LIST_NAMES = ["CA Homeowners — Q3 Batch", "Renewal Book — August", "National Consumer List 12", "Medicare AEP Prospects"];
const LEAD_NAME_POOL = ["Patricia Alvarado", "Kenneth Ubah", "Diane Foster"];
const LEAD_PHONE_POOL = ["(714) 555-0138", "(602) 555-0119", "(313) 555-0187"];

// Explicit per-agent status so the Agent Monitor table demonstrates every
// row-color bucket (including the 4 in-call duration tiers) on first load.
const STATUS_SEQUENCE = [
  "available", "on_call", "on_call", "unready", "lunch", "break", "dispo", "on_call",
  "available", "dead_call", "on_call", "unready", "manual_dial", "break", "available",
];
const ON_CALL_SECONDS = [12, 95, 250, 420];
let onCallCursor = 0;


export const DISPOSITIONS = [
  { key: "booked", label: "Booked Appointment", color: "#10B981" },
  { key: "callback", label: "Callback", color: "#3B82F6" },
  { key: "not_interested", label: "Not Interested", color: "#EF4444" },
  { key: "no_answer", label: "No Answer", color: "#6B7280" },
  { key: "voicemail", label: "Voicemail Left", color: "#5B3FE0" },
  { key: "wrong_number", label: "Wrong Number", color: "#F59E0B" },
  { key: "dnc", label: "Do Not Call", color: "#991B1B" },
  { key: "follow_up", label: "Follow Up", color: "#14B8A6" },
  { key: "language_barrier", label: "Language Barrier", color: "#7C3AED" },
];

// Seed data so the admin Agent Monitor table shows the new logout-reason
// display from first load, before any real timeout/kick has happened.
export const SEED_AGENT_LOGOUTS = [
  { id: "alog-1", agentName: "Devon Carter", reason: "wrapup_timeout", timestamp: Date.now() - 1000 * 60 * 42 },
  { id: "alog-2", agentName: "Noah Bennett", reason: "admin_kick", timestamp: Date.now() - 1000 * 60 * 60 * 3 },
];

export const CAMPAIGNS = [
  {
    id: "camp-1",
    name: "Solar Homeowner Outreach",
    status: "Active",
    mode: "Predictive",
    agents: 12,
    leadList: "CA Homeowners — Q3 Batch",
    callsToday: 4821,
    totalCalls: 38210,
    target: 6000,
    wrapUpSeconds: 60,
    smsEnabled: true,
    smsTemplate:
      "Hi {lead_name}, this is {agent_name} with {company_name} confirming your solar savings appointment. See you soon!",
    assignedAgentNames: ["Jordan Blake", "Marcus Lee", "Grace Kim"],
  },
  {
    id: "camp-2",
    name: "Q3 Insurance Renewals",
    status: "Active",
    mode: "Power",
    agents: 8,
    leadList: "Renewal Book — August",
    callsToday: 2210,
    totalCalls: 15400,
    target: 3000,
    wrapUpSeconds: 45,
    smsEnabled: false,
    smsTemplate: "",
    assignedAgentNames: ["Jordan Blake", "Maria Santos", "Aisha Bello"],
  },
  {
    id: "camp-3",
    name: "Debt Relief Consultation",
    status: "Paused",
    mode: "Progressive",
    agents: 5,
    leadList: "National Consumer List 12",
    callsToday: 0,
    totalCalls: 9820,
    target: 4000,
    wrapUpSeconds: 60,
    smsEnabled: false,
    smsTemplate: "",
    assignedAgentNames: ["Devon Carter", "Noah Bennett"],
  },
  {
    id: "camp-4",
    name: "Medicare Enrollment Blitz",
    status: "Active",
    mode: "Preview",
    agents: 6,
    leadList: "Medicare AEP Prospects",
    callsToday: 980,
    totalCalls: 4120,
    target: 2000,
    wrapUpSeconds: 90,
    smsEnabled: false,
    smsTemplate: "",
    assignedAgentNames: ["Priya Nair", "Sofia Rossi", "Chloe Dubois"],
  },
  {
    id: "camp-5",
    name: "Home Warranty Follow-Up",
    status: "Completed",
    mode: "Power",
    agents: 4,
    leadList: "Warranty Expirations — July",
    callsToday: 0,
    totalCalls: 11230,
    target: 11000,
    wrapUpSeconds: 60,
    smsEnabled: false,
    smsTemplate: "",
    assignedAgentNames: ["Ryan Walsh"],
  },
];

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
export const CLIENTS = [
  {
    id: "client-1",
    name: "Sunrise Solar Partners",
    calendarEnabled: true,
    calendarProvider: "Calendly",
    calendarUrl: "https://calendly.com/sunrise-solar/consultation",
    campaignIds: ["camp-1"],
  },
  {
    id: "client-2",
    name: "Apex Insurance Group",
    calendarEnabled: true,
    calendarProvider: "Acuity Scheduling",
    calendarUrl: "https://apex-insurance.as.me/renewals",
    campaignIds: ["camp-2"],
  },
  {
    id: "client-3",
    name: "Liberty Debt Advisors",
    calendarEnabled: false,
    calendarProvider: "Custom / Other",
    calendarUrl: "",
    campaignIds: ["camp-3"],
  },
  {
    id: "client-4",
    name: "Golden Years Medicare Co.",
    calendarEnabled: true,
    calendarProvider: "Google Calendar",
    calendarUrl: "https://calendar.google.com/calendar/appointments/golden-years-medicare",
    campaignIds: ["camp-4"],
  },
  // Home Warranty Follow-Up (camp-5) intentionally has no client mapping —
  // demonstrates the "missing calendar configuration" fallback.
];

// Removed: SMS_VARIABLES, SMS_PREVIEW_SAMPLE, SMS_TEMPLATES and SEED_SMS_LOG.
// Templates, the variable catalogue and the message log all come from the
// backend now. Sample SMS data sitting alongside real conversations is a
// message somebody eventually believes was really sent.

// Locked fields every lead card always shows — cannot be deleted or reordered by admins.
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
export const DEFAULT_CUSTOM_FIELDS = [
  { id: "cf-1", label: "Roof Age", type: "Number", required: false },
  { id: "cf-2", label: "Home Owner", type: "Yes or No", required: true },
  { id: "cf-3", label: "Appointment Time", type: "Date", required: false },
];









// Seed data so the admin Callback Tracking table has realistic history from
// first load, before any agent has scheduled one live.
export const SEED_CALLBACKS = [
  {
    id: "cb-seed-1",
    agentName: "Maria Santos",
    leadName: "Kenneth Ubah",
    phone: "(602) 555-0119",
    scheduledAt: Date.now() - 1000 * 60 * 60 * 2,
    timezone: "MT",
    status: "Completed",
    completedAt: Date.now() - 1000 * 60 * 60 * 2 + 1000 * 60 * 3,
  },
  {
    id: "cb-seed-2",
    agentName: "Devon Carter",
    leadName: "Diane Foster",
    phone: "(313) 555-0187",
    scheduledAt: Date.now() - 1000 * 60 * 60 * 5,
    timezone: "ET",
    status: "Dismissed",
    dismissedAt: Date.now() - 1000 * 60 * 60 * 5 + 1000 * 30,
  },
  {
    id: "cb-seed-3",
    agentName: "Sofia Rossi",
    leadName: "Patricia Alvarado",
    phone: "(714) 555-0138",
    scheduledAt: Date.now() - 1000 * 60 * 30,
    timezone: "PT",
    status: "Missed",
  },
  {
    id: "cb-seed-4",
    agentName: "Tariq Hassan",
    leadName: "Kenneth Ubah",
    phone: "(602) 555-0119",
    scheduledAt: Date.now() + 1000 * 60 * 60 * 3,
    timezone: "MT",
    status: "Pending",
  },
];




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
export function seedLoginHistory(name, count = 3) {
  const seed = name.length * 17;
  return Array.from({ length: count }).map((_, i) => ({
    id: `login-${name.replace(/\s/g, "")}-${i}`,
    timestamp: Date.now() - (i + 1) * (1000 * 60 * 60 * (6 + i * 5)),
    ip: fakeIp(seed + i),
  }));
}


// ---------------------------------------------------------------------------
// Data backing the restructured admin navigation (Reports / Campaigns /
// Leads / Settings / Phone System dropdown screens).
// ---------------------------------------------------------------------------

const LEAD_FIRST = ["Patricia", "Kenneth", "Diane", "Marcus", "Elena", "Robert", "Nadia", "James", "Yolanda", "Victor", "Renee", "Carl"];
const LEAD_LAST = ["Alvarado", "Ubah", "Foster", "Whitfield", "Ramos", "Chen", "Osei", "Mercer", "Delgado", "Petrov", "Okafor", "Simmons"];
const LEAD_CITIES = [
  { city: "Anaheim", state: "CA" },
  { city: "Tempe", state: "AZ" },
  { city: "Dearborn", state: "MI" },
  { city: "Plano", state: "TX" },
  { city: "Tampa", state: "FL" },
];




// Builds a short seeded score-history trail (used by the DID reputation
// sparkline + trend factor comparisons) walking from `startScore` toward
// `endScore` over `days` daily snapshots.
function buildDidHistory(startScore, endScore, days, startCallsToday, endCallsToday, startAnswerRate, endAnswerRate, startShortCallPct, endShortCallPct, startDnc, endDnc) {
  const points = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const t = 1 - i / (days - 1);
    points.push({
      timestamp: now - i * 24 * 60 * 60 * 1000,
      score: Math.round(startScore + (endScore - startScore) * t),
      callsToday: Math.round(startCallsToday + (endCallsToday - startCallsToday) * t),
      answerRate: Number((startAnswerRate + (endAnswerRate - startAnswerRate) * t).toFixed(1)),
      shortCallPct: Number((startShortCallPct + (endShortCallPct - startShortCallPct) * t).toFixed(1)),
      dncRequests: Math.round(startDnc + (endDnc - startDnc) * t),
    });
  }
  return points;
}

function didEvent(type, detail, daysAgo) {
  return { id: `evt-seed-${type}-${daysAgo}`, type, detail, timestamp: Date.now() - daysAgo * 24 * 60 * 60 * 1000 };
}

// Every DID carries its reputation-engine fields (metrics/registration/
// cooling/history/events) alongside the original fields the Phone System
// pages already read (status/campaignId/recordingEnabled/spamFlag), so
// nothing built before this feature needs to change.
export const PHONE_NUMBERS = [
  {
    id: "num-1",
    number: "(714) 555-0111",
    status: "Active",
    campaignId: "camp-1",
    recordingEnabled: true,
    spamFlag: false,
    registrationStatus: "Registered",
    registrationCarrier: "AT&T",
    ageInDays: 280,
    coolingStatus: "Active",
    coolingReason: null,
    coolingUntil: null,
    pausedReason: null,
    pausedBy: null,
    pausedAt: null,
    lastUsedAt: Date.now() - 1000 * 60 * 6,
    lastUpdated: Date.now() - 1000 * 60 * 6,
    metrics: { answerRate: 22.4, connectRate: 32.1, avgDurationSec: 210, shortCallPct: 4.2, callsToday: 142, callsThisHour: 9, totalCalls: 6840, dncRequests: 0, complaints: 0 },
    trend: { direction: "up", pointsChange: 6 },
    history: buildDidHistory(88, 94, 10, 96, 142, 18.9, 22.4, 6.1, 4.2, 0, 0),
    events: [didEvent("registration_verified", "Carrier confirmed registration with AT&T", 45), didEvent("assigned", "Assigned to Solar Homeowner Outreach", 90)],
    assignmentHistory: [{ campaignName: "Solar Homeowner Outreach", from: Date.now() - 1000 * 60 * 60 * 24 * 90, to: null }],
  },
  {
    id: "num-2",
    number: "(602) 555-0122",
    status: "Active",
    campaignId: "camp-2",
    recordingEnabled: true,
    spamFlag: false,
    registrationStatus: "Registered",
    registrationCarrier: "Verizon",
    ageInDays: 150,
    coolingStatus: "Active",
    coolingReason: null,
    coolingUntil: null,
    pausedReason: null,
    pausedBy: null,
    pausedAt: null,
    lastUsedAt: Date.now() - 1000 * 60 * 18,
    lastUpdated: Date.now() - 1000 * 60 * 18,
    metrics: { answerRate: 14.1, connectRate: 20.3, avgDurationSec: 120, shortCallPct: 15.4, callsToday: 96, callsThisHour: 6, totalCalls: 3120, dncRequests: 2, complaints: 1 },
    trend: { direction: "down", pointsChange: -8 },
    history: buildDidHistory(80, 72, 10, 60, 96, 18.5, 14.1, 10.2, 15.4, 0, 2),
    events: [didEvent("dnc_received", "DNC request logged from lead callback", 3), didEvent("assigned", "Assigned to Q3 Insurance Renewals", 60)],
    assignmentHistory: [{ campaignName: "Q3 Insurance Renewals", from: Date.now() - 1000 * 60 * 60 * 24 * 60, to: null }],
  },
  {
    id: "num-3",
    number: "(313) 555-0133",
    status: "Active",
    campaignId: "camp-3",
    recordingEnabled: false,
    spamFlag: true,
    registrationStatus: "Pending",
    registrationCarrier: null,
    ageInDays: 60,
    coolingStatus: "Active",
    coolingReason: null,
    coolingUntil: null,
    pausedReason: null,
    pausedBy: null,
    pausedAt: null,
    lastUsedAt: Date.now() - 1000 * 60 * 40,
    lastUpdated: Date.now() - 1000 * 60 * 40,
    metrics: { answerRate: 6.8, connectRate: 9.5, avgDurationSec: 45, shortCallPct: 35.2, callsToday: 58, callsThisHour: 3, totalCalls: 1980, dncRequests: 5, complaints: 3 },
    trend: { direction: "down", pointsChange: -14 },
    history: buildDidHistory(62, 48, 10, 40, 58, 12.4, 6.8, 22.0, 35.2, 2, 5),
    events: [didEvent("spam_flag", "Carrier marked this number \"Spam Likely\"", 5), didEvent("registration_submitted", "Registration submitted to carrier — pending", 20)],
    assignmentHistory: [{ campaignName: "Debt Relief Consultation", from: Date.now() - 1000 * 60 * 60 * 24 * 60, to: null }],
  },
  {
    id: "num-4",
    number: "(480) 555-0144",
    status: "Active",
    campaignId: "camp-4",
    recordingEnabled: true,
    spamFlag: false,
    registrationStatus: "Registered",
    registrationCarrier: "T-Mobile",
    ageInDays: 310,
    coolingStatus: "Active",
    coolingReason: null,
    coolingUntil: null,
    pausedReason: null,
    pausedBy: null,
    pausedAt: null,
    lastUsedAt: Date.now() - 1000 * 60 * 3,
    lastUpdated: Date.now() - 1000 * 60 * 3,
    metrics: { answerRate: 20.2, connectRate: 30.4, avgDurationSec: 195, shortCallPct: 6.0, callsToday: 88, callsThisHour: 5, totalCalls: 7410, dncRequests: 0, complaints: 0 },
    trend: { direction: "up", pointsChange: 3 },
    history: buildDidHistory(89, 91, 10, 70, 88, 19.0, 20.2, 6.8, 6.0, 0, 0),
    events: [didEvent("assigned", "Assigned to Medicare Enrollment Blitz", 200)],
    assignmentHistory: [{ campaignName: "Medicare Enrollment Blitz", from: Date.now() - 1000 * 60 * 60 * 24 * 200, to: null }],
  },
  {
    id: "num-5",
    number: "(213) 555-0155",
    status: "Unassigned",
    campaignId: null,
    recordingEnabled: true,
    spamFlag: false,
    registrationStatus: "Not Registered",
    registrationCarrier: null,
    ageInDays: 15,
    coolingStatus: "Paused",
    coolingReason: null,
    coolingUntil: null,
    pausedReason: "Auto-paused by score — fell below the auto-pause threshold",
    pausedBy: "System",
    pausedAt: Date.now() - 1000 * 60 * 60 * 9,
    lastUsedAt: Date.now() - 1000 * 60 * 60 * 10,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 9,
    metrics: { answerRate: 2.6, connectRate: 4.8, avgDurationSec: 18, shortCallPct: 55.0, callsToday: 21, callsThisHour: 0, totalCalls: 640, dncRequests: 9, complaints: 6 },
    trend: { direction: "down", pointsChange: -21 },
    history: buildDidHistory(51, 30, 10, 34, 21, 9.0, 2.6, 34.0, 55.0, 4, 9),
    events: [didEvent("paused", "Auto-paused by score — fell below the auto-pause threshold", 0.4), didEvent("carrier_block", "Carrier flagged number for suspicious call volume", 2)],
    assignmentHistory: [{ campaignName: "Home Warranty Follow-Up", from: Date.now() - 1000 * 60 * 60 * 24 * 15, to: Date.now() - 1000 * 60 * 60 * 24 * 2 }],
  },
  {
    id: "num-6",
    number: "(949) 555-0166",
    status: "Active",
    campaignId: "camp-1",
    recordingEnabled: true,
    spamFlag: false,
    registrationStatus: "Registered",
    registrationCarrier: "AT&T",
    ageInDays: 100,
    coolingStatus: "Cooling",
    coolingReason: "DNC requests reached the limit (3/3)",
    coolingUntil: Date.now() + 1000 * 60 * 60 * 14,
    pausedReason: null,
    pausedBy: null,
    pausedAt: null,
    lastUsedAt: Date.now() - 1000 * 60 * 60 * 10,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 10,
    metrics: { answerRate: 12.3, connectRate: 18.1, avgDurationSec: 100, shortCallPct: 18.4, callsToday: 64, callsThisHour: 0, totalCalls: 2240, dncRequests: 3, complaints: 1 },
    trend: { direction: "down", pointsChange: -9 },
    history: buildDidHistory(74, 65, 10, 40, 64, 15.6, 12.3, 12.0, 18.4, 0, 3),
    events: [didEvent("cooling_started", "DNC requests reached the limit (3/3)", 0.6), didEvent("assigned", "Assigned to Solar Homeowner Outreach", 100)],
    assignmentHistory: [{ campaignName: "Solar Homeowner Outreach", from: Date.now() - 1000 * 60 * 60 * 24 * 100, to: null }],
  },
  {
    id: "num-7",
    number: "(520) 555-0177",
    status: "Active",
    campaignId: "camp-2",
    recordingEnabled: true,
    spamFlag: false,
    registrationStatus: "Registered",
    registrationCarrier: "Verizon",
    ageInDays: 200,
    coolingStatus: "Active",
    coolingReason: null,
    coolingUntil: null,
    pausedReason: null,
    pausedBy: null,
    pausedAt: null,
    lastUsedAt: Date.now() - 1000 * 60 * 12,
    lastUpdated: Date.now() - 1000 * 60 * 12,
    metrics: { answerRate: 19.2, connectRate: 28.3, avgDurationSec: 180, shortCallPct: 8.1, callsToday: 110, callsThisHour: 7, totalCalls: 5510, dncRequests: 1, complaints: 0 },
    trend: { direction: "up", pointsChange: 4 },
    history: buildDidHistory(84, 88, 10, 80, 110, 17.0, 19.2, 9.5, 8.1, 1, 1),
    events: [didEvent("assigned", "Assigned to Q3 Insurance Renewals", 140)],
    assignmentHistory: [{ campaignName: "Q3 Insurance Renewals", from: Date.now() - 1000 * 60 * 60 * 24 * 140, to: null }],
  },
  {
    id: "num-8",
    number: "(810) 555-0188",
    status: "Active",
    campaignId: "camp-5",
    recordingEnabled: true,
    spamFlag: false,
    registrationStatus: "Not Registered",
    registrationCarrier: null,
    ageInDays: 45,
    coolingStatus: "Active",
    coolingReason: null,
    coolingUntil: null,
    pausedReason: null,
    pausedBy: null,
    pausedAt: null,
    lastUsedAt: Date.now() - 1000 * 60 * 55,
    lastUpdated: Date.now() - 1000 * 60 * 55,
    metrics: { answerRate: 9.4, connectRate: 13.6, avgDurationSec: 60, shortCallPct: 28.0, callsToday: 41, callsThisHour: 2, totalCalls: 1340, dncRequests: 4, complaints: 2 },
    trend: { direction: "down", pointsChange: -5 },
    history: buildDidHistory(60, 55, 10, 30, 41, 11.0, 9.4, 24.0, 28.0, 3, 4),
    events: [didEvent("registration_expired", "Registration lapsed — needs renewal", 12), didEvent("assigned", "Assigned to Home Warranty Follow-Up", 45)],
    assignmentHistory: [{ campaignName: "Home Warranty Follow-Up", from: Date.now() - 1000 * 60 * 60 * 24 * 45, to: null }],
  },
];

export const IVR_RULES = [
  { id: "ivr-1", key: "1", label: "Sales / New Lead", routesTo: "Queue A" },
  { id: "ivr-2", key: "2", label: "Existing Customer Support", routesTo: "Queue B" },
  { id: "ivr-3", key: "3", label: "Leave a Voicemail", routesTo: "Voicemail Box" },
];

// Events available to the two event-driven integrations (Zapier's outbound
// webhook and Slack's channel posts) — admin picks which ones fire.
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
export const INTEGRATIONS = [
  {
    id: "int-1",
    name: "Salesforce",
    description: "Sync qualified leads and dispositions.",
    connected: true,
    type: "crm",
    config: { instanceUrl: "https://10xpowerdialer.my.salesforce.com", apiKey: "sk_live_51Hx9f2LqA3dP8c", syncLeads: true, syncDispositions: true },
  },
  {
    id: "int-2",
    name: "HubSpot",
    description: "Push call activity to HubSpot CRM.",
    connected: false,
    type: "crm",
    config: { instanceUrl: "", apiKey: "", syncLeads: false, syncDispositions: false },
  },
  {
    id: "int-3",
    name: "Zapier",
    description: "Trigger workflows from call events.",
    connected: true,
    type: "webhook",
    config: { webhookUrl: "https://hooks.10xpowerdialer.com/zapier/8f2ad91c", events: ["booked_appointment", "dnc_request"] },
  },
  {
    id: "int-4",
    name: "Google Sheets",
    description: "Export daily reports automatically.",
    connected: false,
    type: "export",
    config: { accountEmail: "", sheetUrl: "", report: EXPORTABLE_REPORTS[0], autoExport: false },
  },
  {
    id: "int-5",
    name: "Slack",
    description: "Post booked-appointment alerts to a channel.",
    connected: false,
    type: "notify",
    config: { workspace: "", channel: "#booked-appointments", events: ["booked_appointment"] },
  },
];


export const DEFAULT_ADMIN_SETTINGS = {
  general: { companyName: "10X Power Dialer", timezone: "America/Los_Angeles" },
  dialer: { defaultWrapUpSeconds: 60, callingHoursStart: "08:00", callingHoursEnd: "21:00", timezoneIntelligence: true },
  numberRotation: { enabled: true, rotateEveryCalls: 250 },
  spamDetection: { enabled: true, alertThreshold: 3 },
  emailNotifications: {
    autoLogout: true,
    campaignPaused: true,
    leadListUploaded: false,
    spamFlagged: true,
  },
};
