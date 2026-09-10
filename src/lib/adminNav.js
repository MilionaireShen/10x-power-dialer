import {
  Headphones,
  BarChart3,
  FolderKanban,
  ListChecks,
  Users as UsersIcon,
  Settings as SettingsIcon,
  PhoneCall,
  Home,
  HelpCircle,
} from "lucide-react";

// Single source of truth for the admin navigation — the top dropdown bar
// and the icon sidebar both render from this, and App.jsx routes off the
// same paths. Every `anyPermission` key is a real user_permissions column
// (can_*), the same keys the backend managerAccess gate checks: a nav
// item an admin granted a manager is an API call they can also make.
//
// For a manager, a section shows only if they hold one of its section-level
// `anyPermission` keys AND (when set) an item shows only if they hold one
// of its item-level `anyPermission` keys. Admins/super-admins always see
// everything (except superAdminOnly items).
export const ADMIN_NAV = [
  {
    key: "callcenter",
    label: "Call Center",
    icon: Headphones,
    anyPermission: ["can_listen_calls", "can_whisper_calls", "can_barge_calls", "can_send_broadcast", "can_view_calls", "can_view_call_history", "can_view_sms_conversations", "can_view_agent_sms", "can_view_campaign_sms"],
    items: [
      { label: "Agent Monitor", path: "/admin/call-center/agent-monitor", anyPermission: ["can_listen_calls", "can_whisper_calls", "can_barge_calls", "can_view_calls"] },
      { label: "Live Calls", path: "/admin/call-center/live-calls", anyPermission: ["can_view_calls"] },
      { label: "Callbacks", path: "/admin/call-center/callbacks", anyPermission: ["can_view_call_history", "can_view_campaign_reports", "can_view_dashboard"] },
      { label: "Inbound Queue", path: "/admin/call-center/inbound-queue", anyPermission: ["can_view_calls"] },
      { label: "Broadcast Message", path: "/admin/call-center/broadcast", anyPermission: ["can_send_broadcast"] },
      { label: "SMS Inbox", path: "/admin/sms-inbox", anyPermission: ["can_view_sms_conversations", "can_view_agent_sms", "can_view_campaign_sms"] },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    anyPermission: ["can_view_campaign_reports", "can_view_agent_reports", "can_view_financial_metrics", "can_export_reports", "can_download_recordings", "can_view_call_history", "can_access_call_analytics", "can_view_sms_logs", "can_view_email_activity", "can_view_email_analytics"],
    items: [
      { label: "Agent Performance", path: "/admin/reports/agent-performance", anyPermission: ["can_view_agent_reports"] },
      { label: "Agent Productivity Logs", path: "/admin/reports/productivity-logs", anyPermission: ["can_view_agent_reports"] },
      { label: "Call Logs", path: "/admin/reports/call-logs", anyPermission: ["can_view_call_history", "can_view_calls"] },
      { label: "Call Recordings", path: "/admin/reports/call-recordings", anyPermission: ["can_download_recordings"] },
      { label: "SMS Logs", path: "/admin/reports/sms-logs", anyPermission: ["can_view_sms_logs"] },
      { label: "Email Reports", path: "/admin/reports/email", anyPermission: ["can_view_email_activity", "can_view_email_analytics"] },
      { label: "Callback Reports", path: "/admin/reports/callback-reports", anyPermission: ["can_view_campaign_reports", "can_view_agent_reports"] },
      { label: "Campaign Reports", path: "/admin/reports/campaign-reports", anyPermission: ["can_view_campaign_reports"] },
      { label: "Disposition Reports", path: "/admin/reports/disposition-reports", anyPermission: ["can_view_campaign_reports", "can_view_agent_reports"] },
      { label: "Custom Reports", path: "/admin/reports/custom-reports", anyPermission: ["can_view_campaign_reports", "can_view_agent_reports"] },
      { label: "Exports", path: "/admin/reports/exports", anyPermission: ["can_export_reports"] },
      { label: "Admin Activity Log", path: "/admin/reports/activity-log", anyPermission: ["can_view_agent_reports"] },
      { label: "Global Reports", path: "/superadmin/dashboard", superAdminOnly: true },
    ],
  },
  {
    key: "campaigns",
    label: "Campaigns",
    icon: FolderKanban,
    anyPermission: ["can_view_campaigns", "can_create_campaigns", "can_edit_campaigns", "can_pause_campaigns", "can_change_dialing_mode", "can_assign_agents", "can_upload_leads", "can_manage_dnc", "can_manage_campaign_settings", "can_manage_scripts", "can_manage_dispositions", "can_enable_sms", "can_edit_sms_templates", "can_enable_email", "can_edit_email_templates"],
    items: [
      { label: "All Campaigns", path: "/admin/campaigns/all", anyPermission: ["can_view_campaigns"] },
      { label: "Create New Campaign", path: "/admin/campaigns/all?create=1", anyPermission: ["can_create_campaigns"] },
      { label: "Lead Lists", path: "/admin/campaigns/lead-lists", anyPermission: ["can_upload_leads", "can_view_leads"] },
      { label: "DNC List", path: "/admin/campaigns/dnc", anyPermission: ["can_manage_dnc", "can_view_leads"] },
      { label: "Scripts", path: "/admin/campaigns/scripts", anyPermission: ["can_manage_scripts", "can_view_campaigns"] },
      { label: "SMS Templates", path: "/admin/campaigns/sms-templates", anyPermission: ["can_edit_sms_templates"] },
      { label: "Email Templates", path: "/admin/campaigns/email-templates", anyPermission: ["can_edit_email_templates"] },
      { label: "Dispositions", path: "/admin/campaigns/dispositions", anyPermission: ["can_manage_dispositions", "can_view_campaigns"] },
      { label: "Client Calendars", path: "/admin/campaigns/client-calendars", anyPermission: ["can_manage_campaign_settings"] },
      { label: "DID Protection", path: "/admin/campaigns/did-protection", anyPermission: ["can_manage_campaign_settings", "can_view_phone_system"] },
    ],
  },
  {
    key: "leads",
    label: "Leads",
    icon: ListChecks,
    anyPermission: ["can_view_leads", "can_upload_leads", "can_edit_leads", "can_manage_dnc", "can_assign_leads", "can_export_leads"],
    items: [
      { label: "Lead Search", path: "/admin/leads/search", anyPermission: ["can_view_leads"] },
      { label: "Upload Leads", path: "/admin/leads/upload", anyPermission: ["can_upload_leads"] },
      { label: "Lead Lists", path: "/admin/leads/lists", anyPermission: ["can_view_leads", "can_upload_leads"] },
      { label: "Lead List Health", path: "/admin/leads/health", anyPermission: ["can_view_leads"] },
      { label: "Custom Fields", path: "/admin/leads/custom-fields", anyPermission: ["can_edit_leads", "can_manage_campaign_settings"] },
    ],
  },
  {
    key: "users",
    label: "Users",
    icon: UsersIcon,
    anyPermission: ["can_view_users", "can_create_users", "can_edit_users", "can_deactivate_users", "can_delete_users", "can_manage_permissions"],
    items: [
      { label: "All Users", path: "/admin/users/all", anyPermission: ["can_view_users"] },
      { label: "Add New User", path: "/admin/users/all?add=1", anyPermission: ["can_create_users"] },
      { label: "Role Permissions", path: "/admin/users/permissions", anyPermission: ["can_manage_permissions"] },
      { label: "Active Sessions", path: "/admin/users/sessions", anyPermission: ["can_view_users", "can_view_agent_reports"] },
      { label: "Login History", path: "/admin/users/login-history", anyPermission: ["can_view_users", "can_view_agent_reports"] },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: SettingsIcon,
    anyPermission: ["can_view_settings", "can_edit_settings", "can_manage_company_settings", "can_manage_communication_settings", "can_manage_dialing_settings", "can_view_billing", "can_manage_billing"],
    items: [
      { label: "General Settings", path: "/admin/settings/general", anyPermission: ["can_view_settings", "can_edit_settings", "can_manage_company_settings"] },
      { label: "Dialer Settings", path: "/admin/settings/dialer", anyPermission: ["can_manage_dialing_settings", "can_edit_settings"] },
      { label: "Phone Numbers", path: "/admin/settings/phone-numbers", anyPermission: ["can_view_phone_system", "can_manage_phone_numbers"] },
      { label: "Number Rotation Settings", path: "/admin/settings/number-rotation", anyPermission: ["can_manage_dialing_settings"] },
      { label: "Spam Detection Settings", path: "/admin/settings/spam-detection", anyPermission: ["can_manage_dialing_settings", "can_edit_settings"] },
      { label: "Email Notifications", path: "/admin/settings/email-notifications", anyPermission: ["can_manage_communication_settings", "can_manage_email_settings"] },
      { label: "Integrations", path: "/admin/settings/integrations", anyPermission: ["can_manage_company_settings"] },
      { label: "Billing", path: "/admin/settings/billing", anyPermission: ["can_view_billing", "can_manage_billing"] },
      { label: "Hotkey Management", path: "/admin/settings/hotkeys", anyPermission: ["can_manage_campaign_settings", "can_edit_settings"] },
      { label: "Companies", path: "/admin/settings/companies", superAdminOnly: true },
    ],
  },
  {
    key: "phonesystem",
    label: "Phone System",
    icon: PhoneCall,
    anyPermission: ["can_view_phone_system", "can_manage_phone_numbers", "can_manage_routing", "can_manage_dialing_settings"],
    items: [
      { label: "Phone Numbers", path: "/admin/phone-system/numbers", anyPermission: ["can_view_phone_system", "can_manage_phone_numbers"] },
      { label: "Add Number", path: "/admin/phone-system/numbers?add=1", anyPermission: ["can_manage_phone_numbers"] },
      { label: "Number Assignment", path: "/admin/phone-system/assignment", anyPermission: ["can_manage_phone_numbers", "can_manage_routing"] },
      { label: "Call Recording Settings", path: "/admin/phone-system/recording-settings", anyPermission: ["can_manage_phone_numbers", "can_manage_dialing_settings"] },
      { label: "Voicemail Settings", path: "/admin/phone-system/voicemail", anyPermission: ["can_manage_phone_numbers", "can_manage_routing"] },
      { label: "IVR Settings", path: "/admin/phone-system/ivr", anyPermission: ["can_manage_routing"] },
      { label: "DID Management", path: "/admin/phone-system/did-management", anyPermission: ["can_view_phone_system", "can_manage_phone_numbers"] },
      { label: "DID Reputation Settings", path: "/admin/phone-system/did-settings", anyPermission: ["can_manage_phone_numbers", "can_manage_dialing_settings"] },
    ],
  },
];

export const SIDEBAR_EXTRAS = { home: { label: "Home", icon: Home, path: "/admin/dashboard" }, help: { label: "Help", icon: HelpCircle, path: "/knowledge" } };
