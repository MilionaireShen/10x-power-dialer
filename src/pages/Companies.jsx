import { useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import StatusPill from "../components/StatusPill";
import Avatar from "../components/Avatar";
import { COMPANIES as INITIAL_COMPANIES, AGENTS, CAMPAIGNS, LEADERBOARD } from "../data/mockData";
import { useToast } from "../lib/ToastContext";

export default function Companies() {
  const { notify } = useToast();
  const [companies, setCompanies] = useState(INITIAL_COMPANIES);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [detailCompany, setDetailCompany] = useState(null);

  const toggleSuspend = (id) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === "Active" ? "Suspended" : "Active" } : c))
    );
    setMenuOpenFor(null);
  };

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Companies"
        actions={
          <button onClick={() => setOnboardOpen(true)} className="btn-purple">
            <Plus size={15} /> Onboard New Company
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-8 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((c) => (
          <div key={c.id} className="card relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-bold text-white">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    {c.seatsUsed}/{c.seatsTotal} seats used
                  </p>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setMenuOpenFor(menuOpenFor === c.id ? null : c.id)}
                  className="rounded-full p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpenFor === c.id && (
                  <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
                    <button
                      onClick={() => {
                        notify(`Editing "${c.name}" (demo).`, "info");
                        setMenuOpenFor(null);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleSuspend(c.id)}
                      className="block w-full px-3 py-2 text-left text-sm text-[var(--color-warning)] hover:bg-[var(--color-bg)]"
                    >
                      {c.status === "Active" ? "Suspend" : "Reactivate"}
                    </button>
                    <button
                      onClick={() => {
                        setDetailCompany(c);
                        setMenuOpenFor(null);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                    >
                      View Details
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Calls Today" value={c.callsToday.toLocaleString()} />
              <MiniStat label="Campaigns" value={c.campaigns} />
              <MiniStat label="Rate/Seat" value={`$${c.monthlyRate}`} />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span
                className="pill"
                style={{
                  backgroundColor: c.status === "Active" ? "var(--color-success-tint)" : "var(--color-danger-tint)",
                  color: c.status === "Active" ? "var(--color-success)" : "var(--color-danger)",
                }}
              >
                {c.status}
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${(c.seatsUsed / c.seatsTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <OnboardPanel open={onboardOpen} onClose={() => setOnboardOpen(false)} onCreate={(c) => setCompanies((p) => [c, ...p])} />
      <CompanyDetailPanel company={detailCompany} onClose={() => setDetailCompany(null)} />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg)] px-2 py-2">
      <p className="text-base font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}

function OnboardPanel({ open, onClose, onCreate }) {
  const { notify } = useToast();
  const [form, setForm] = useState({ name: "", firstName: "", lastName: "", email: "", seats: 10, rate: 500 });
  const [phoneNumbers, setPhoneNumbers] = useState([]);

  const availableNumbers = ["(888) 555-0111", "(888) 555-0122", "(888) 555-0133", "(888) 555-0144"];

  const togglePhone = (n) => {
    setPhoneNumbers((prev) => (prev.includes(n) ? prev.filter((p) => p !== n) : [...prev, n]));
  };

  const save = () => {
    if (!form.name.trim() || !form.email.trim()) {
      notify("Company name and admin email are required.", "warning");
      return;
    }
    onCreate({
      id: `co-${Date.now()}`,
      name: form.name,
      seatsUsed: 0,
      seatsTotal: Number(form.seats),
      callsToday: 0,
      campaigns: 0,
      status: "Active",
      monthlyRate: Number(form.rate),
    });
    notify(`${form.name} onboarded — credentials sent to ${form.email}.`, "success", { title: "Company Onboarded" });
    setForm({ name: "", firstName: "", lastName: "", email: "", seats: 10, rate: 500 });
    setPhoneNumbers([]);
    onClose();
  };

  return (
    <SidePanel open={open} onClose={onClose} title="Onboard New Company" subtitle="Set up a new tenant and its admin">
      <div className="space-y-5">
        <Field label="Company Name">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Bright Path Solar" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Admin First Name">
            <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="input-field" />
          </Field>
          <Field label="Admin Last Name">
            <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="input-field" />
          </Field>
        </div>
        <Field label="Admin Email">
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field" placeholder="admin@company.com" />
        </Field>
        <Field label="Number of Seats">
          <input type="number" min={1} value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))} className="input-field" />
        </Field>
        <Field label="Assign Phone Numbers">
          <div className="space-y-1 rounded-lg border border-[var(--color-border)] p-2">
            {availableNumbers.map((n) => (
              <label key={n} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]">
                <input type="checkbox" checked={phoneNumbers.includes(n)} onChange={() => togglePhone(n)} className="accent-[var(--color-accent)]" />
                {n}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Monthly Seat Rate ($)">
          <input type="number" min={0} value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} className="input-field" />
        </Field>
        <button onClick={save} className="btn-purple w-full py-3">
          Save and Send Credentials
        </button>
      </div>
    </SidePanel>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}

function CompanyDetailPanel({ company, onClose }) {
  const [tab, setTab] = useState("agents");
  if (!company) return null;

  const tabs = [
    { key: "agents", label: "Agents" },
    { key: "campaigns", label: "Campaigns" },
    { key: "leaderboard", label: "Leaderboard" },
    { key: "seats", label: "Seat Usage" },
  ];

  return (
    <SidePanel open={!!company} onClose={onClose} title={company.name} subtitle="Company detail view" widthClass="max-w-xl">
      <div className="mb-4 flex gap-2 border-b border-[var(--color-border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
              tab === t.key ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "agents" && (
        <div className="space-y-2">
          {AGENTS.slice(0, company.seatsUsed || 5).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar name={a.name} size={30} />
                <span className="text-sm text-[var(--color-text-primary)]">{a.name}</span>
              </div>
              <StatusPill status={a.status} since={a.statusSince} size="sm" />
            </div>
          ))}
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-2">
          {CAMPAIGNS.slice(0, company.campaigns || 2).map((c) => (
            <div key={c.id} className="rounded-lg bg-[var(--color-bg)] px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{c.name}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {c.mode} · {c.callsToday.toLocaleString()} calls today
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="space-y-2">
          {LEADERBOARD.slice(0, 5).map((a) => (
            <div key={a.rank} className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-3 py-2.5">
              <span className="text-sm text-[var(--color-text-primary)]">
                #{a.rank} {a.name}
              </span>
              <span className="text-xs text-[var(--color-success)]">{a.appointments} booked</span>
            </div>
          ))}
        </div>
      )}

      {tab === "seats" && (
        <div className="rounded-lg bg-[var(--color-bg)] p-4">
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {company.seatsUsed}/{company.seatsTotal}
          </p>
          <p className="mb-3 text-xs text-[var(--color-text-tertiary)]">seats in use</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${(company.seatsUsed / company.seatsTotal) * 100}%` }}
            />
          </div>
        </div>
      )}
    </SidePanel>
  );
}
