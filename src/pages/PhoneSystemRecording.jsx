import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import { useToast } from "../lib/ToastContext";

export default function PhoneSystemRecording() {
  const { phoneNumbers, updatePhoneNumber } = useAppData();
  const { notify } = useToast();
  const allEnabled = phoneNumbers.every((n) => n.recordingEnabled);

  const toggleAll = () => {
    phoneNumbers.forEach((n) => updatePhoneNumber(n.id, { recordingEnabled: !allEnabled }));
    notify(`Call recording ${allEnabled ? "disabled" : "enabled"} for all numbers.`, "success");
  };

  return (
    <div>
      <ScreenHeader category="Phone System" title="Call Recording Settings" />
      <div className="p-8 space-y-6">
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Record All Calls</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">Applies to every phone number at once — override per-number below</p>
          </div>
          <button onClick={toggleAll} className="btn-gray">
            {allEnabled ? "Disable All" : "Enable All"}
          </button>
        </div>

        <div className="card divide-y divide-[var(--color-border)] p-0">
          {phoneNumbers.map((n) => (
            <div key={n.id} className="flex items-center justify-between px-5 py-3.5">
              <span className="font-medium text-[var(--color-text-primary)]">{n.number}</span>
              <button
                onClick={() => updatePhoneNumber(n.id, { recordingEnabled: !n.recordingEnabled })}
                className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${n.recordingEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
              >
                <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${n.recordingEnabled ? "translate-x-5" : ""}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
