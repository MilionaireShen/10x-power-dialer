// The integrations this product offers, and what each one's settings panel
// looks like. This is UI configuration — the list of what CAN be connected —
// not data about what IS connected, which comes from the API.
//
// No credentials live here. The previous version shipped a plausible-looking
// Salesforce key in frontend source, which is exactly the shape of a real leak
// even when the value is invented.
export const INTEGRATION_CATALOGUE = [
  {
    provider: "salesforce",
    name: "Salesforce",
    description: "Sync qualified leads and dispositions.",
    type: "crm",
  },
  {
    provider: "hubspot",
    name: "HubSpot",
    description: "Push call activity to HubSpot CRM.",
    type: "crm",
  },
  {
    provider: "zapier",
    name: "Zapier",
    description: "Fire a webhook when key events happen.",
    type: "webhook",
  },
  {
    provider: "google_sheets",
    name: "Google Sheets",
    description: "Export daily reports automatically.",
    type: "export",
  },
  {
    provider: "slack",
    name: "Slack",
    description: "Post booked-appointment alerts to a channel.",
    type: "notify",
  },
];

// Blank config per panel type, so a never-connected integration opens with
// empty fields rather than someone else's leftovers.
export const EMPTY_CONFIG = {
  crm: { instanceUrl: "", syncLeads: false, syncDispositions: false },
  webhook: { webhookUrl: "", events: [] },
  export: { accountEmail: "", sheetUrl: "", report: "", autoExport: false },
  notify: { workspace: "", channel: "", events: [] },
};
