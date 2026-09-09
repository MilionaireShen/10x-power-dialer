// Renders the Agent "Customer Information" section from the admin-configured
// field layout (GET /agent/lead-fields) instead of a hard-coded list.
//
// Each config entry has a field_name (the stable mapping key to the loaded
// lead's data — never shown) and a field_label (what the admin wants the
// agent to see). Values are read from the current lead every render, so
// moving to the next lead swaps every value with no stale data. An empty
// value shows a clean placeholder, never "undefined" / "null".

// field_name -> how to read/write it on the flat lead object the agent
// screen holds (see mapLeadFromApi in AgentDashboard). Anything not listed
// is treated as a custom field stored under lead.customValues[field_name].
const LEAD_KEYS = {
  full_name: "fullName",
  first_name: "firstName",
  last_name: "lastName",
  phone_number: "phone",
  phone: "phone",
  email: "email",
  street_address: "street",
  address: "street",
  city: "city",
  state: "state",
  zip_code: "zip",
  zip: "zip",
  age: "age",
  timezone: "timezone",
  notes: "notes",
  last_travel_date: "lastTravelDate",
  last_travel_destination: "lastTravelDestination",
};

const EMPTY_LABEL = "Not provided";

export default function CustomerInfoFields({ fields, lead, onUpdateField, onUpdateCustom, onViewProperty, readOnly = false }) {
  const list = Array.isArray(fields) ? fields : [];

  // Nothing to show until a real lead is loaded — keeps the section out of
  // the "waiting for a lead" screen.
  if (!lead?.id) return null;

  const readValue = (fieldName) => {
    const key = LEAD_KEYS[fieldName];
    const raw = key ? lead?.[key] : lead?.customValues?.[fieldName];
    if (raw === undefined || raw === null) return "";
    return typeof raw === "object" ? "" : String(raw);
  };

  const writeValue = (fieldName, value) => {
    if (readOnly) return;
    const key = LEAD_KEYS[fieldName];
    if (key) onUpdateField?.(key, value);
    else onUpdateCustom?.(fieldName, value);
  };

  if (list.length === 0) {
    // Config not loaded yet (or none configured) — render nothing rather
    // than a broken section; the parent still shows the rest of the card.
    return null;
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Customer Information
        </h3>
        {onViewProperty && (
          <button onClick={onViewProperty} className="btn-outline py-1 px-2.5 text-xs">
            View Property
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((f) => {
          const value = readValue(f.field_name);
          return (
            <div key={f.id || f.field_name}>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                {f.field_label}
              </label>
              {readOnly ? (
                <p className={`input-field bg-[var(--color-bg)] ${value ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>
                  {value || EMPTY_LABEL}
                </p>
              ) : (
                <input
                  value={value}
                  placeholder={EMPTY_LABEL}
                  inputMode={f.field_type === "number" ? "numeric" : undefined}
                  onChange={(e) => writeValue(f.field_name, e.target.value)}
                  className="input-field"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
