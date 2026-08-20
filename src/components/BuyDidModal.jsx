import { useState } from "react";
import { Search, Phone, MessageSquare, Check } from "lucide-react";
import SidePanel from "./SidePanel";
import { useToast } from "../lib/ToastContext";
import didService from "../services/didService";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// The search results shape isn't pinned down yet (this goes through our own
// backend's /dids/search, which itself proxies Telnyx's available-numbers
// API — the frontend never calls Telnyx directly, since that would require
// shipping a secret Telnyx API key to the browser) — so this reads several
// plausible field names rather than assuming one exact response shape.
function normalizeAvailable(n) {
  const costInfo = n.cost_information || {};
  const regions = n.region_information || [];
  const stateRegion = regions.find((r) => r.region_type === "state")?.region_name;
  const cityRegion = regions.find((r) => r.region_type === "rate_center")?.region_name;
  const features = Array.isArray(n.features) ? n.features.map((f) => (typeof f === "string" ? f : f.name)) : [];
  return {
    phoneNumber: n.phone_number ?? n.number ?? "",
    monthlyCost: Number(n.monthly_cost ?? costInfo.monthly_cost ?? n.cost ?? 0),
    state: n.state ?? stateRegion ?? "—",
    city: n.city ?? cityRegion ?? "—",
    voice: n.voice_enabled ?? features.includes("voice") ?? true,
    sms: n.sms_enabled ?? features.includes("sms") ?? false,
  };
}

export default function BuyDidModal({ open, onClose, onPurchased }) {
  const { notify } = useToast();
  const [areaCode, setAreaCode] = useState("");
  const [state, setState] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [buyingNumber, setBuyingNumber] = useState(null);
  const [purchasedNumbers, setPurchasedNumbers] = useState([]);

  const handleClose = () => {
    setAreaCode("");
    setState("");
    setSearched(false);
    setResults([]);
    setPurchasedNumbers([]);
    onClose();
  };

  const handleSearch = () => {
    const trimmedAreaCode = areaCode.trim();
    if (!trimmedAreaCode && !state) {
      notify("Enter an area code or choose a state to search.", "warning");
      return;
    }
    setSearching(true);
    const params = { limit: 10 };
    if (trimmedAreaCode) params.area_code = trimmedAreaCode;
    else params.state = state;
    didService
      .search(params)
      .then((res) => setResults((res.data || []).map(normalizeAvailable)))
      .catch((err) => {
        notify(err?.message || "Could not search for available numbers.", "error");
        setResults([]);
      })
      .finally(() => {
        setSearching(false);
        setSearched(true);
      });
  };

  const handleBuy = (phoneNumber) => {
    setBuyingNumber(phoneNumber);
    didService
      .buy(phoneNumber)
      .then(() => {
        notify("Number purchased successfully!", "success");
        setPurchasedNumbers((prev) => [...prev, phoneNumber]);
        onPurchased?.();
      })
      .catch((err) => notify(err?.message || "Could not purchase this number.", "error"))
      .finally(() => setBuyingNumber(null));
  };

  return (
    <SidePanel open={open} onClose={handleClose} title="Buy a DID" subtitle="Search Telnyx's available numbers and purchase directly">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Area Code</label>
            <input
              value={areaCode}
              onChange={(e) => {
                setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3));
                if (e.target.value) setState("");
              }}
              placeholder="e.g. 714"
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Or State</label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                if (e.target.value) setAreaCode("");
              }}
              className="input-field"
            >
              <option value="">Any</option>
              {US_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleSearch} disabled={searching} className="btn-purple w-full py-2.5">
          <Search size={15} /> {searching ? "Searching…" : "Search Numbers"}
        </button>

        {searched && !searching && results.length === 0 && (
          <p className="rounded-lg bg-[var(--color-bg)] px-4 py-6 text-center text-sm text-[var(--color-text-tertiary)]">
            No available numbers found for that search.
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((n) => {
              const purchased = purchasedNumbers.includes(n.phoneNumber);
              const buying = buyingNumber === n.phoneNumber;
              return (
                <div key={n.phoneNumber} className="rounded-lg border border-[var(--color-border)] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">{n.phoneNumber}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                        {n.city !== "—" ? `${n.city}, ` : ""}
                        {n.state}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {n.voice && (
                          <span className="pill text-[10px]" style={{ backgroundColor: "var(--color-info-tint)", color: "var(--color-info)" }}>
                            <Phone size={10} /> Voice
                          </span>
                        )}
                        {n.sms && (
                          <span className="pill text-[10px]" style={{ backgroundColor: "var(--color-success-tint)", color: "var(--color-success)" }}>
                            <MessageSquare size={10} /> SMS
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">${n.monthlyCost.toFixed(2)}/mo</p>
                      <button
                        onClick={() => handleBuy(n.phoneNumber)}
                        disabled={purchased || buying}
                        className={`mt-2 ${purchased ? "btn-gray" : "btn-purple"} py-1.5 px-3 text-xs`}
                      >
                        {purchased ? (
                          <>
                            <Check size={12} /> Purchased
                          </>
                        ) : buying ? (
                          "Buying…"
                        ) : (
                          "Buy"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidePanel>
  );
}
