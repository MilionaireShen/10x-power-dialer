import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, DASHBOARD_PATH_BY_ROLE } from "./lib/AuthContext";
import { AppDataProvider } from "./lib/AppDataContext";
import { ToastProvider } from "./lib/ToastContext";
import AppLayout from "./components/AppLayout";
import RequireRole from "./components/RequireRole";

import AgentLogin from "./pages/AgentLogin";
import AdminLogin from "./pages/AdminLogin";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import AgentDashboard from "./pages/AgentDashboard";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import KnowledgeCenter from "./pages/KnowledgeCenter";
import Companies from "./pages/Companies";
import SuperAdminOverview from "./pages/SuperAdminOverview";
import Clients from "./pages/Clients";
import AccessDenied from "./pages/AccessDenied";

import CallCenterAgentMonitor from "./pages/CallCenterAgentMonitor";
import CallCenterLiveCalls from "./pages/CallCenterLiveCalls";
import CallCenterCallbacks from "./pages/CallCenterCallbacks";
import CallCenterInboundQueue from "./pages/CallCenterInboundQueue";
import CallCenterBroadcast from "./pages/CallCenterBroadcast";

import ReportsAgentPerformance from "./pages/ReportsAgentPerformance";
import ReportsProductivityLogs from "./pages/ReportsProductivityLogs";
import ReportsCallLogs from "./pages/ReportsCallLogs";
import ReportsCallRecordings from "./pages/ReportsCallRecordings";
import ReportsSmsLogs from "./pages/ReportsSmsLogs";
import ReportsEmail from "./pages/ReportsEmail";
import SmsInbox from "./pages/SmsInbox";
import ReportsCallbackReports from "./pages/ReportsCallbackReports";
import ReportsCampaignReports from "./pages/ReportsCampaignReports";
import ReportsDispositionReports from "./pages/ReportsDispositionReports";
import ReportsCustomReports from "./pages/ReportsCustomReports";
import ReportsExports from "./pages/ReportsExports";
import ReportsActivityLog from "./pages/ReportsActivityLog";

import CampaignsAll from "./pages/CampaignsAll";
import CampaignsLeadLists from "./pages/CampaignsLeadLists";
import CampaignsDnc from "./pages/CampaignsDnc";
import CampaignsScripts from "./pages/CampaignsScripts";
import CampaignsSmsTemplates from "./pages/CampaignsSmsTemplates";
import CampaignsEmailTemplates from "./pages/CampaignsEmailTemplates";
import CampaignsDispositions from "./pages/CampaignsDispositions";

import LeadsSearch from "./pages/LeadsSearch";
import LeadsUpload from "./pages/LeadsUpload";
import LeadsLists from "./pages/LeadsLists";
import LeadsHealth from "./pages/LeadsHealth";
import LeadsCustomFields from "./pages/LeadsCustomFields";

import UsersAll from "./pages/UsersAll";
import UsersPermissions from "./pages/UsersPermissions";
import UsersSessions from "./pages/UsersSessions";
import UsersLoginHistory from "./pages/UsersLoginHistory";

import SettingsGeneral from "./pages/SettingsGeneral";
import SettingsDialer from "./pages/SettingsDialer";
import SettingsNumberRotation from "./pages/SettingsNumberRotation";
import SettingsSpamDetection from "./pages/SettingsSpamDetection";
import SettingsEmailNotifications from "./pages/SettingsEmailNotifications";
import SettingsIntegrations from "./pages/SettingsIntegrations";
import SettingsBilling from "./pages/SettingsBilling";
import HotkeySettings from "./pages/HotkeySettings";

import PhoneNumbers from "./pages/PhoneNumbers";
import PhoneSystemAssignment from "./pages/PhoneSystemAssignment";
import PhoneSystemRecording from "./pages/PhoneSystemRecording";
import PhoneSystemVoicemail from "./pages/PhoneSystemVoicemail";
import PhoneSystemIvr from "./pages/PhoneSystemIvr";
import DIDManagement from "./pages/DIDManagement";
import DIDReputationSettings from "./pages/DIDReputationSettings";
import DIDProtection from "./pages/DIDProtection";
import DIDHealthReport from "./pages/DIDHealthReport";

const ADMIN_ROLES = ["admin", "manager", "super_admin"];

// All keys below are real user_permissions columns (can_* prefixed). The
// backend managerAccess gate checks the same keys, so hiding a nav item
// and blocking its API are driven by one list, never two that can drift.
const CALLCENTER_PERMS = ["can_listen_calls", "can_whisper_calls", "can_barge_calls", "can_send_broadcast", "can_view_calls", "can_view_sms_conversations", "can_view_agent_sms", "can_view_campaign_sms", "can_view_call_history"];
const REPORTS_PERMS = [
  "can_view_campaign_reports",
  "can_view_agent_reports",
  "can_view_financial_metrics",
  "can_export_reports",
  "can_download_recordings",
  "can_view_call_history",
  "can_access_call_analytics",
  "can_view_sms_logs",
  "can_view_email_activity",
  "can_view_email_analytics",
];
const CAMPAIGNS_PERMS = ["can_view_campaigns", "can_create_campaigns", "can_edit_campaigns", "can_pause_campaigns", "can_change_dialing_mode", "can_assign_agents", "can_upload_leads", "can_manage_dnc", "can_manage_campaign_settings", "can_manage_scripts", "can_manage_dispositions", "can_enable_sms", "can_edit_sms_templates", "can_enable_email", "can_edit_email_templates"];
const SMS_PERMS = ["can_view_sms_conversations", "can_view_agent_sms", "can_view_campaign_sms", "can_view_sms_logs", "can_send_sms"];
const LEADS_PERMS = ["can_view_leads", "can_upload_leads", "can_edit_leads", "can_manage_dnc", "can_assign_leads", "can_export_leads"];
const USERS_PERMS = ["can_view_users", "can_create_users", "can_edit_users", "can_deactivate_users", "can_delete_users", "can_manage_permissions"];
const SETTINGS_PERMS = ["can_view_settings", "can_edit_settings", "can_manage_company_settings", "can_manage_communication_settings", "can_manage_dialing_settings"];
const PHONESYS_PERMS = ["can_view_phone_system", "can_manage_phone_numbers", "can_manage_routing", "can_manage_dialing_settings"];
const BILLING_PERMS = ["can_view_billing", "can_manage_billing"];

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/agent/login" replace />;
  return <Navigate to={DASHBOARD_PATH_BY_ROLE[user.role]} replace />;
}

function Admin({ children, anyPermission }) {
  return (
    <RequireRole roles={ADMIN_ROLES} loginPath="/admin/login" anyPermission={anyPermission}>
      {children}
    </RequireRole>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/agent/login" element={<AgentLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/superadmin/login" element={<SuperAdminLogin />} />
              {/* legacy single login link, kept working */}
              <Route path="/login" element={<Navigate to="/agent/login" replace />} />

              <Route path="/" element={<AppLayout />}>
                <Route index element={<RoleHome />} />

                <Route
                  path="agent/dashboard"
                  element={
                    <RequireRole roles={["agent"]} loginPath="/agent/login">
                      <AgentDashboard />
                    </RequireRole>
                  }
                />

                <Route
                  path="admin/dashboard"
                  element={
                    <RequireRole roles={ADMIN_ROLES} loginPath="/admin/login">
                      <Home />
                    </RequireRole>
                  }
                />

                <Route
                  path="superadmin/dashboard"
                  element={
                    <RequireRole roles={["super_admin"]} loginPath="/superadmin/login">
                      <SuperAdminOverview />
                    </RequireRole>
                  }
                />

                {/* Call Center */}
                <Route path="admin/call-center/agent-monitor" element={<Admin anyPermission={CALLCENTER_PERMS}><CallCenterAgentMonitor /></Admin>} />
                <Route path="admin/call-center/live-calls" element={<Admin anyPermission={CALLCENTER_PERMS}><CallCenterLiveCalls /></Admin>} />
                <Route path="admin/call-center/callbacks" element={<Admin anyPermission={CALLCENTER_PERMS}><CallCenterCallbacks /></Admin>} />
                <Route path="admin/call-center/inbound-queue" element={<Admin anyPermission={CALLCENTER_PERMS}><CallCenterInboundQueue /></Admin>} />
                <Route path="admin/sms-inbox" element={<Admin anyPermission={SMS_PERMS}><SmsInbox /></Admin>} />
                <Route path="admin/call-center/broadcast" element={<Admin anyPermission={CALLCENTER_PERMS}><CallCenterBroadcast /></Admin>} />

                {/* Reports */}
                <Route path="admin/reports/agent-performance" element={<Admin anyPermission={REPORTS_PERMS}><ReportsAgentPerformance /></Admin>} />
                <Route path="admin/reports/productivity-logs" element={<Admin anyPermission={REPORTS_PERMS}><ReportsProductivityLogs /></Admin>} />
                <Route path="admin/reports/call-logs" element={<Admin anyPermission={REPORTS_PERMS}><ReportsCallLogs /></Admin>} />
                <Route path="admin/reports/call-recordings" element={<Admin anyPermission={REPORTS_PERMS}><ReportsCallRecordings /></Admin>} />
                <Route path="admin/reports/sms-logs" element={<Admin anyPermission={REPORTS_PERMS}><ReportsSmsLogs /></Admin>} />
                <Route path="admin/reports/email" element={<Admin anyPermission={REPORTS_PERMS}><ReportsEmail /></Admin>} />
                <Route path="admin/reports/callback-reports" element={<Admin anyPermission={REPORTS_PERMS}><ReportsCallbackReports /></Admin>} />
                <Route path="admin/reports/campaign-reports" element={<Admin anyPermission={REPORTS_PERMS}><ReportsCampaignReports /></Admin>} />
                <Route path="admin/reports/disposition-reports" element={<Admin anyPermission={REPORTS_PERMS}><ReportsDispositionReports /></Admin>} />
                <Route path="admin/reports/custom-reports" element={<Admin anyPermission={REPORTS_PERMS}><ReportsCustomReports /></Admin>} />
                <Route path="admin/reports/exports" element={<Admin anyPermission={REPORTS_PERMS}><ReportsExports /></Admin>} />
                <Route path="admin/reports/activity-log" element={<Admin anyPermission={REPORTS_PERMS}><ReportsActivityLog /></Admin>} />

                {/* Campaigns */}
                <Route path="admin/campaigns/all" element={<Admin anyPermission={CAMPAIGNS_PERMS}><CampaignsAll /></Admin>} />
                <Route path="admin/campaigns/lead-lists" element={<Admin anyPermission={CAMPAIGNS_PERMS}><CampaignsLeadLists /></Admin>} />
                <Route path="admin/campaigns/dnc" element={<Admin anyPermission={CAMPAIGNS_PERMS}><CampaignsDnc /></Admin>} />
                <Route path="admin/campaigns/scripts" element={<Admin anyPermission={CAMPAIGNS_PERMS}><CampaignsScripts /></Admin>} />
                <Route path="admin/campaigns/sms-templates" element={<Admin anyPermission={CAMPAIGNS_PERMS}><CampaignsSmsTemplates /></Admin>} />
                <Route path="admin/campaigns/email-templates" element={<Admin anyPermission={CAMPAIGNS_PERMS}><CampaignsEmailTemplates /></Admin>} />
                <Route path="admin/campaigns/dispositions" element={<Admin anyPermission={CAMPAIGNS_PERMS}><CampaignsDispositions /></Admin>} />
                <Route path="admin/campaigns/client-calendars" element={<Admin anyPermission={CAMPAIGNS_PERMS}><Clients /></Admin>} />
                <Route path="admin/campaigns/did-protection" element={<Admin anyPermission={CAMPAIGNS_PERMS}><DIDProtection /></Admin>} />

                {/* Leads */}
                <Route path="admin/leads/search" element={<Admin anyPermission={LEADS_PERMS}><LeadsSearch /></Admin>} />
                <Route path="admin/leads/upload" element={<Admin anyPermission={LEADS_PERMS}><LeadsUpload /></Admin>} />
                <Route path="admin/leads/lists" element={<Admin anyPermission={LEADS_PERMS}><LeadsLists /></Admin>} />
                <Route path="admin/leads/health" element={<Admin anyPermission={LEADS_PERMS}><LeadsHealth /></Admin>} />
                <Route path="admin/leads/custom-fields" element={<Admin anyPermission={LEADS_PERMS}><LeadsCustomFields /></Admin>} />

                {/* Users — admin/super_admin, or a manager granted a users permission */}
                <Route path="admin/users/all" element={<Admin anyPermission={USERS_PERMS}><UsersAll /></Admin>} />
                <Route path="admin/users/permissions" element={<Admin anyPermission={["can_manage_permissions"]}><UsersPermissions /></Admin>} />
                <Route path="admin/users/sessions" element={<Admin anyPermission={["can_view_users", "can_view_agent_reports"]}><UsersSessions /></Admin>} />
                <Route path="admin/users/login-history" element={<Admin anyPermission={["can_view_users", "can_view_agent_reports"]}><UsersLoginHistory /></Admin>} />

                {/* Settings — admin/super_admin, or a manager granted a settings permission */}
                <Route path="admin/settings/general" element={<Admin anyPermission={SETTINGS_PERMS}><SettingsGeneral /></Admin>} />
                <Route path="admin/settings/dialer" element={<Admin anyPermission={["can_manage_dialing_settings", "can_edit_settings"]}><SettingsDialer /></Admin>} />
                <Route path="admin/settings/phone-numbers" element={<Admin anyPermission={PHONESYS_PERMS}><PhoneNumbers /></Admin>} />
                <Route path="admin/settings/number-rotation" element={<Admin anyPermission={["can_manage_dialing_settings"]}><SettingsNumberRotation /></Admin>} />
                <Route path="admin/settings/spam-detection" element={<Admin anyPermission={["can_manage_dialing_settings", "can_edit_settings"]}><SettingsSpamDetection /></Admin>} />
                <Route path="admin/settings/email-notifications" element={<Admin anyPermission={["can_manage_communication_settings", "can_manage_email_settings"]}><SettingsEmailNotifications /></Admin>} />
                <Route path="admin/settings/integrations" element={<Admin anyPermission={["can_manage_company_settings"]}><SettingsIntegrations /></Admin>} />
                <Route path="admin/settings/billing" element={<Admin anyPermission={BILLING_PERMS}><SettingsBilling /></Admin>} />
                <Route path="admin/settings/hotkeys" element={<Admin anyPermission={["can_manage_campaign_settings", "can_edit_settings"]}><HotkeySettings /></Admin>} />
                <Route
                  path="admin/settings/companies"
                  element={
                    <RequireRole roles={["super_admin"]} loginPath="/superadmin/login">
                      <Companies />
                    </RequireRole>
                  }
                />

                {/* Phone System — admin/super_admin, or a manager granted a phone-system permission */}
                <Route path="admin/phone-system/numbers" element={<Admin anyPermission={PHONESYS_PERMS}><PhoneNumbers /></Admin>} />
                <Route path="admin/phone-system/assignment" element={<Admin anyPermission={["can_manage_phone_numbers", "can_manage_routing"]}><PhoneSystemAssignment /></Admin>} />
                <Route path="admin/phone-system/recording-settings" element={<Admin anyPermission={["can_manage_phone_numbers", "can_manage_dialing_settings"]}><PhoneSystemRecording /></Admin>} />
                <Route path="admin/phone-system/voicemail" element={<Admin anyPermission={["can_manage_phone_numbers", "can_manage_routing"]}><PhoneSystemVoicemail /></Admin>} />
                <Route path="admin/phone-system/ivr" element={<Admin anyPermission={["can_manage_routing"]}><PhoneSystemIvr /></Admin>} />
                <Route path="admin/phone-system/did-management" element={<Admin anyPermission={PHONESYS_PERMS}><DIDManagement /></Admin>} />
                <Route path="admin/phone-system/did-settings" element={<Admin anyPermission={["can_manage_phone_numbers", "can_manage_dialing_settings"]}><DIDReputationSettings /></Admin>} />
                <Route path="admin/phone-system/did/:didId" element={<Admin anyPermission={PHONESYS_PERMS}><DIDHealthReport /></Admin>} />

                <Route
                  path="leaderboard"
                  element={
                    <RequireRole roles={["agent", "admin", "manager", "super_admin"]} loginPath="/agent/login">
                      <Leaderboard />
                    </RequireRole>
                  }
                />
                <Route
                  path="knowledge"
                  element={
                    <RequireRole roles={["admin", "manager", "super_admin"]} loginPath="/admin/login" anyPermission={["can_access_knowledge_center", "can_view_knowledge_admin"]}>
                      <KnowledgeCenter />
                    </RequireRole>
                  }
                />
                <Route path="access-denied" element={<AccessDenied />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AppDataProvider>
    </AuthProvider>
  );
}
