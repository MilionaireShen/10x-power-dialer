import { useEffect, useRef, useState } from "react";
import { Check, AlertTriangle, GripVertical } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../lib/AppDataContext";
import userService from "../services/userService";
import { useToast } from "../lib/ToastContext";

const WEIGHT_LABELS = {
  answerRate: "Answer rate weight",
  connectRate: "Connect rate weight",
  avgDuration: "Average call duration weight",
  shortCallPct: "Short call percentage weight",
  dncRequests: "DNC requests weight",
  complaints: "Complaints weight",
  numberAge: "Number age weight",
  registration: "Registration status weight",
};

const THRESHOLD_LABELS = {
  healthy: "Healthy threshold",
  warning: "Warning threshold",
  critical: "Critical threshold",
  autoPause: "Auto-pause threshold",
};

const METHOD_OPTIONS = ["email", "in-app", "both"];
const METHOD_LABEL = { email: "Email", "in-app": "In-App", both: "Email + In-App" };

export default function DIDReputationSettings() {
  const { didSettings, updateDidSettings } = useAppData();
  const [users, setUsers] = useState([]);
  useEffect(() => {
    userService.list().then((r) => setUsers(r?.data || [])).catch(() => setUsers([]));
  }, []);
  const { notify } = useToast();

  const weightTotal = Object.values(didSettings.weights).reduce((a, b) => a + b, 0);

  const alertRecipients = users.filter((u) => u.role === "admin" || u.role === "manager" || u.role === "super_admin");

  const toggleRecipient = (email) => {
    const current = didSettings.alerts.recipients;
    const next = current.includes(email) ? current.filter((r) => r !== email) : [...current, email];
    updateDidSettings("alerts", { recipients: next });
  };

  return (
    <div>
      <ScreenHeader category="Phone System" title="DID Reputation Settings" />
      <div className="p-8 space-y-8">
        <div className="card border border-[var(--color-accent)]/25 bg-[var(--color-accent-tint)] text-sm text-[var(--color-text-primary)]">
          These are the <span className="font-semibold">global defaults</span> — they apply to every campaign unless a campaign has its own override configured under{" "}
          <span className="font-semibold">Campaigns → DID Protection</span>.
        </div>

        {/* Health Score Weights */}
        <section className="card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Health Score Weights</h2>
            <span
              className={`pill ${weightTotal === 100 ? "" : ""}`}
              style={{
                backgroundColor: weightTotal === 100 ? "var(--color-success-tint)" : "var(--color-warning-tint)",
                color: weightTotal === 100 ? "var(--color-success)" : "var(--color-warning)",
              }}
            >
              {weightTotal === 100 ? <Check size={12} /> : <AlertTriangle size={12} />}
              Total: {weightTotal}%
            </span>
          </div>
          <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">Weights should add up to 100%. Adjust a slider and it saves instantly.</p>
          <div className="space-y-4">
            {Object.keys(WEIGHT_LABELS).map((key) => (
              <WeightSlider
                key={key}
                label={WEIGHT_LABELS[key]}
                value={didSettings.weights[key]}
                onChange={(value) => updateDidSettings("weights", { [key]: value })}
              />
            ))}
          </div>
        </section>

        {/* Score Thresholds */}
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Score Thresholds</h2>
          <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">Where each health band begins. Saves instantly.</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.keys(THRESHOLD_LABELS).map((key) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{THRESHOLD_LABELS[key]}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={didSettings.thresholds[key]}
                  onChange={(e) => updateDidSettings("thresholds", { [key]: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Cooling Rules */}
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Cooling Rules</h2>
          <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">When a DID trips one of these, it's automatically cooled or paused.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField label="Maximum calls per day" value={didSettings.cooling.maxCallsPerDay} onChange={(v) => updateDidSettings("cooling", { maxCallsPerDay: v })} />
            <NumberField label="Maximum calls per hour" value={didSettings.cooling.maxCallsPerHour} onChange={(v) => updateDidSettings("cooling", { maxCallsPerHour: v })} />
            <NumberField label="Minimum answer rate (%)" value={didSettings.cooling.minAnswerRate} onChange={(v) => updateDidSettings("cooling", { minAnswerRate: v })} />
            <NumberField label="Maximum short call percentage (%)" value={didSettings.cooling.maxShortCallPct} onChange={(v) => updateDidSettings("cooling", { maxShortCallPct: v })} />
            <NumberField label="Maximum DNC requests before cooling" value={didSettings.cooling.maxDncRequests} onChange={(v) => updateDidSettings("cooling", { maxDncRequests: v })} />
            <NumberField label="Cooling period duration (hours)" value={didSettings.cooling.coolingPeriodHours} onChange={(v) => updateDidSettings("cooling", { coolingPeriodHours: v })} />
            <NumberField label="Resume minimum score required" value={didSettings.cooling.resumeMinScore} onChange={(v) => updateDidSettings("cooling", { resumeMinScore: v })} />
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Auto-resume after cooling</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">If off, admin must resume manually</p>
              </div>
              <button
                onClick={() => updateDidSettings("cooling", { autoResume: !didSettings.cooling.autoResume })}
                className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${didSettings.cooling.autoResume ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
              >
                <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${didSettings.cooling.autoResume ? "translate-x-5" : ""}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Rotation Priorities */}
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Rotation Priorities</h2>
          <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">Drag to reorder — the system applies these factors top to bottom when picking the best DID for a call.</p>
          <RotationPriorityList priorities={didSettings.rotationPriorities} onReorder={(next) => updateDidSettings("rotationPriorities", next)} />
        </section>

        {/* Alert Thresholds */}
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Alert Thresholds</h2>
          <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">Who gets notified, and how, when a DID needs attention.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField label="Alert when score drops below" value={didSettings.alerts.scoreBelow} onChange={(v) => updateDidSettings("alerts", { scoreBelow: v })} />
            <NumberField label="Alert when answer rate drops below (%)" value={didSettings.alerts.answerRateBelow} onChange={(v) => updateDidSettings("alerts", { answerRateBelow: v })} />
            <NumberField label="Alert when DNC requests exceed" value={didSettings.alerts.dncExceeds} onChange={(v) => updateDidSettings("alerts", { dncExceeds: v })} />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Alert Recipients</p>
            <div className="flex flex-wrap gap-2">
              {alertRecipients.map((u) => {
                const active = didSettings.alerts.recipients.includes(u.email);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleRecipient(u.email)}
                    className="pill border transition-colors"
                    style={{
                      borderColor: active ? "var(--color-accent)" : "var(--color-border-strong)",
                      backgroundColor: active ? "var(--color-accent-tint)" : "white",
                      color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                    }}
                  >
                    {u.firstName} {u.lastName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">Alert Method</p>
            <div className="flex overflow-hidden rounded-full border border-[var(--color-border-strong)] w-fit">
              {METHOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => updateDidSettings("alerts", { method: m })}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    didSettings.alerts.method === m ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                  }`}
                >
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Registration Requirements */}
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Registration Requirements</h2>
          <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">Registration is tracked separately from reputation score and never affects it directly.</p>
          <div className="space-y-3">
            <ToggleRow
              label="Require registration for dialing"
              desc="New DIDs must be registered before they can be assigned to a campaign"
              checked={didSettings.registration.requireRegistration}
              onChange={() => updateDidSettings("registration", { requireRegistration: !didSettings.registration.requireRegistration })}
            />
            <ToggleRow
              label="Block unregistered numbers"
              desc="Unregistered DIDs are excluded from the eligible dialing pool entirely"
              checked={didSettings.registration.blockUnregistered}
              onChange={() => updateDidSettings("registration", { blockUnregistered: !didSettings.registration.blockUnregistered })}
            />
            <ToggleRow
              label="Alert on unregistered numbers"
              desc="Admins are notified whenever a DID is not registered"
              checked={didSettings.registration.alertOnUnregistered}
              onChange={() => updateDidSettings("registration", { alertOnUnregistered: !didSettings.registration.alertOnUnregistered })}
            />
          </div>
        </section>

        <div className="flex flex-col items-center gap-2 pb-4 pt-2 text-center">
          <button onClick={() => notify("Global DID reputation settings saved.", "success", { title: "Settings Saved" })} className="btn-purple px-8 py-3">
            Save Global Settings
          </button>
          <p className="text-xs text-[var(--color-text-tertiary)]">Changes apply immediately to all campaigns without campaign-specific overrides.</p>
        </div>
      </div>
    </div>
  );
}

function WeightSlider({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--color-text-secondary)]">{label}</span>
        <span className="font-semibold text-[var(--color-text-primary)]">{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="input-field" />
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{desc}</p>
      </div>
      <button onClick={onChange} className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}>
        <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function RotationPriorityList({ priorities, onReorder }) {
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const reorder = (from, to) => {
    const next = [...priorities];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <div className="space-y-2">
      {priorities.map((p, i) => (
        <div
          key={p.key}
          draggable
          onDragStart={() => (dragIndex.current = i)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverIndex(i);
          }}
          onDragLeave={() => setDragOverIndex((cur) => (cur === i ? null : cur))}
          onDrop={() => {
            if (dragIndex.current === null || dragIndex.current === i) return;
            reorder(dragIndex.current, i);
            dragIndex.current = null;
            setDragOverIndex(null);
          }}
          className={`flex cursor-grab items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition-colors ${
            dragOverIndex === i ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)]" : "border-[var(--color-border)]"
          }`}
        >
          <GripVertical size={16} className="shrink-0 text-[var(--color-text-tertiary)]" />
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-xs font-semibold text-[var(--color-accent)]">{i + 1}</span>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
