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
const ADMIN_ONLY_ROLES = ["admin", "super_admin"];

const CALLCENTER_PERMS = ["view_agent_monitor", "listen_live", "whisper_agents", "barge_calls", "send_broadcast"];
const REPORTS_PERMS = [
  "view_campaign_reports",
  "view_agent_reports",
  "view_conversion_reports",
  "view_duration_reports",
  "export_csv",
  "export_pdf",
  "view_financial_metrics",
  "view_leadlist_performance",
  "listen_recordings",
  "download_recordings",
];
const CAMPAIGNS_PERMS = ["create_campaigns", "edit_campaigns", "pause_resume_campaigns", "change_dialing_mode", "assign_agents_campaigns", "upload_lead_lists", "manage_dnc", "can_enable_sms", "can_edit_sms_templates"];
// The permissions the server actually checks on /sms/conversations, so the
// route and the API agree on who may open the inbox.
const SMS_PERMS = ["can_view_sms_conversations", "can_view_agent_sms", "can_view_campaign_sms"];
const LEADS_PERMS = ["upload_lead_lists", "manage_dnc", "view_leadlist_performance"];

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

function AdminOnly({ children }) {
  return (
    <RequireRole roles={ADMIN_ONLY_ROLES} loginPath="/admin/login">
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
                <Route path="admin/campaigns/dispositions" element={<Admin anyPermission={CAMPAIGNS_PERMS}><CampaignsDispositions /></Admin>} />
                <Route path="admin/campaigns/client-calendars" element={<Admin anyPermission={CAMPAIGNS_PERMS}><Clients /></Admin>} />
                <Route path="admin/campaigns/did-protection" element={<Admin anyPermission={CAMPAIGNS_PERMS}><DIDProtection /></Admin>} />

                {/* Leads */}
                <Route path="admin/leads/search" element={<Admin anyPermission={LEADS_PERMS}><LeadsSearch /></Admin>} />
                <Route path="admin/leads/upload" element={<Admin anyPermission={LEADS_PERMS}><LeadsUpload /></Admin>} />
                <Route path="admin/leads/lists" element={<Admin anyPermission={LEADS_PERMS}><LeadsLists /></Admin>} />
                <Route path="admin/leads/health" element={<Admin anyPermission={LEADS_PERMS}><LeadsHealth /></Admin>} />
                <Route path="admin/leads/custom-fields" element={<Admin anyPermission={LEADS_PERMS}><LeadsCustomFields /></Admin>} />

                {/* Users — admin/super_admin only */}
                <Route path="admin/users/all" element={<AdminOnly><UsersAll /></AdminOnly>} />
                <Route path="admin/users/permissions" element={<AdminOnly><UsersPermissions /></AdminOnly>} />
                <Route path="admin/users/sessions" element={<AdminOnly><UsersSessions /></AdminOnly>} />
                <Route path="admin/users/login-history" element={<AdminOnly><UsersLoginHistory /></AdminOnly>} />

                {/* Settings — admin/super_admin only */}
                <Route path="admin/settings/general" element={<AdminOnly><SettingsGeneral /></AdminOnly>} />
                <Route path="admin/settings/dialer" element={<AdminOnly><SettingsDialer /></AdminOnly>} />
                <Route path="admin/settings/phone-numbers" element={<AdminOnly><PhoneNumbers /></AdminOnly>} />
                <Route path="admin/settings/number-rotation" element={<AdminOnly><SettingsNumberRotation /></AdminOnly>} />
                <Route path="admin/settings/spam-detection" element={<AdminOnly><SettingsSpamDetection /></AdminOnly>} />
                <Route path="admin/settings/email-notifications" element={<AdminOnly><SettingsEmailNotifications /></AdminOnly>} />
                <Route path="admin/settings/integrations" element={<AdminOnly><SettingsIntegrations /></AdminOnly>} />
                <Route path="admin/settings/billing" element={<AdminOnly><SettingsBilling /></AdminOnly>} />
                <Route path="admin/settings/hotkeys" element={<AdminOnly><HotkeySettings /></AdminOnly>} />
                <Route
                  path="admin/settings/companies"
                  element={
                    <RequireRole roles={["super_admin"]} loginPath="/superadmin/login">
                      <Companies />
                    </RequireRole>
                  }
                />

                {/* Phone System — admin/super_admin only */}
                <Route path="admin/phone-system/numbers" element={<AdminOnly><PhoneNumbers /></AdminOnly>} />
                <Route path="admin/phone-system/assignment" element={<AdminOnly><PhoneSystemAssignment /></AdminOnly>} />
                <Route path="admin/phone-system/recording-settings" element={<AdminOnly><PhoneSystemRecording /></AdminOnly>} />
                <Route path="admin/phone-system/voicemail" element={<AdminOnly><PhoneSystemVoicemail /></AdminOnly>} />
                <Route path="admin/phone-system/ivr" element={<AdminOnly><PhoneSystemIvr /></AdminOnly>} />
                <Route path="admin/phone-system/did-management" element={<AdminOnly><DIDManagement /></AdminOnly>} />
                <Route path="admin/phone-system/did-settings" element={<AdminOnly><DIDReputationSettings /></AdminOnly>} />
                <Route path="admin/phone-system/did/:didId" element={<AdminOnly><DIDHealthReport /></AdminOnly>} />

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
                    <RequireRole roles={["admin", "manager", "super_admin"]} loginPath="/admin/login" anyPermission={["view_knowledge_center"]}>
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
