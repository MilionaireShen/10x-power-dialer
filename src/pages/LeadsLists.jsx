import ScreenHeader from "../components/ScreenHeader";
import LeadListsManager from "../components/LeadListsManager";

// Leads → Lead Lists. Same component (and same data) as Campaigns → Lead
// Lists — assigning a list to a campaign here shows up there and vice versa.
export default function LeadsLists() {
  return (
    <div>
      <ScreenHeader category="Leads" title="Lead Lists" />
      <div className="p-8">
        <LeadListsManager />
      </div>
    </div>
  );
}
