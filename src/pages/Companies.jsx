import { useCallback, useEffect, useState } from "react";
import { Building2, RefreshCw, Pencil } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import SidePanel from "../components/SidePanel";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import api from "../services/api";
import adminService from "../services/adminService";

// Companies on the platform, with what each one has actually done. The seat
// counts, call volumes and campaign lists here are counted from real rows —
// there is no notion of a plan or a seat allowance in the data model, so
// nothing pretends to know one.

function hours(seconds) {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function Companies() {
  const { notify } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/admin/global-overview");
      setCompanies(res.data?.data?.companies || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load companies.";
      setError(message);
      notify(message, "error");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (c) => {
    setDetail(c);
    setEditing(false);
    setNameDraft(c.name);
  };

  const saveName = async () => {
    const next = nameDraft.trim();
    if (!next) { notify("The company name cannot be empty.", "error"); return; }
    if (next === detail.name) { setEditing(false); return; }
    setSavingName(true);
    try {
      await adminService.updateCompanyById(detail.company_id, { name: next });
      // Same company id — only the name changed. Update the row in place so
      // the list and the open panel both reflect it without a full reload.
      setCompanies((list) => list.map((c) => (c.company_id === detail.company_id ? { ...c, name: next } : c)));
      setDetail((d) => ({ ...d, name: next }));
      setEditing(false);
      notify("Company name updated.", "success");
    } catch (err) {
      notify(err?.response?.data?.message || "Could not update the company name.", "error");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div>
      <ScreenHeader
        category="Settings"
        title="Companies"
        actions={
          <button onClick={load} className="btn-outline py-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {loading ? (
        <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      ) : error ? (
        <div className="p-8"><EmptyState icon={Building2} title="Could not load companies" description={error} /></div>
      ) : companies.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={Building2}
            title="No companies on the platform yet"
            description="Companies appear here once they exist in the database."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-8 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((c) => (
            <button
              key={c.company_id}
              onClick={() => openDetail(c)}
              className="card relative text-left transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-bold text-white">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    {c.users} user{c.users === 1 ? "" : "s"} · {c.agents_online} online now
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Calls" value={c.calls.toLocaleString()} />
                <Stat label="Answered" value={c.answered.toLocaleString()} />
                <Stat label="Booked" value={c.appointments} accent="text-[var(--color-success)]" />
              </div>

              <p className="mt-3 text-[11px] text-[var(--color-text-tertiary)]">
                {hours(c.talk_seconds)} talk time in this period
              </p>
            </button>
          ))}
        </div>
      )}

      <SidePanel
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name || "Company"}
        subtitle="Activity in the current reporting period"
        widthClass="max-w-md"
      >
        {detail && (
          <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Company Name</label>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="input-field flex-1 py-1.5 text-sm"
                  autoFocus
                />
                <button onClick={saveName} disabled={savingName} className="btn-purple shrink-0 px-3 py-1.5 text-sm disabled:opacity-40">
                  {savingName ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setEditing(false); setNameDraft(detail.name); }} className="btn-outline shrink-0 px-3 py-1.5 text-sm">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{detail.name}</span>
                <button onClick={() => setEditing(true)} className="btn-outline shrink-0 px-3 py-1 text-xs">
                  <Pencil size={12} /> Edit
                </button>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
              Editing the name updates this company in place — the company ID and every campaign, agent and lead stay attached to it.
            </p>
          </div>
        )}
        {detail && (
          <dl className="space-y-2 text-sm">
            <Row label="Users" value={detail.users} />
            <Row label="Agents online now" value={detail.agents_online} />
            <Row label="Calls placed" value={detail.calls.toLocaleString()} />
            <Row label="Calls answered" value={detail.answered.toLocaleString()} />
            <Row
              label="Answer rate"
              value={detail.calls ? `${((detail.answered / detail.calls) * 100).toFixed(1)}%` : "—"}
            />
            <Row label="Talk time" value={hours(detail.talk_seconds)} />
            <Row label="Appointments booked" value={detail.appointments} />
            <Row
              label="On the platform since"
              value={detail.created_at ? new Date(detail.created_at).toLocaleDateString() : "—"}
            />
          </dl>
        )}
      </SidePanel>
    </div>
  );
}

function Stat({ label, value, accent = "text-[var(--color-text-primary)]" }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg)] px-2 py-2">
      <p className={`text-base font-semibold ${accent}`}>{value}</p>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2 last:border-0">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="font-medium text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
