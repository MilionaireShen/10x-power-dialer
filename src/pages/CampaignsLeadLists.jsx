import ScreenHeader from "../components/ScreenHeader";
import LeadListsManager from "../components/LeadListsManager";

export default function CampaignsLeadLists() {
  return (
    <div>
      <ScreenHeader category="Campaigns" title="Lead Lists" />
      <div className="p-8">
        <LeadListsManager />
      </div>
    </div>
  );
}
