import ScreenHeader from "../components/ScreenHeader";
import AdminCallbackTracking from "../components/AdminCallbackTracking";

export default function CallCenterCallbacks() {
  return (
    <div>
      <ScreenHeader category="Call Center" title="Callbacks" />
      <div className="p-8">
        <AdminCallbackTracking />
      </div>
    </div>
  );
}
