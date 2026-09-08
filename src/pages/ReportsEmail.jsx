import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Search, X, ChevronLeft, ChevronRight, ShieldOff, Trash2, Plus } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import emailService from "../services/emailService";

const PAGE_SIZE = 25;

const STATUS_META = {
  queued: ["Queued", "#D97706"],
  sent: ["Sent", "#2563EB"],
  delivered: ["Delivered", "#059669"],
  opened: ["Opened", "#059669"],
  clicked: ["Clicked", "#059669"],
  deferred: ["Deferred", "#D97706"],
  bounced: ["Bounced", "#DC2626"],
  failed: ["Failed", "#DC2626"],
  unsubscribed: ["Unsubscribed", "#D97706"],
  complained: ["Spam complaint", "#DC2626"],
};

const EMAIL_TYPE_LABEL = { information: "Vacation Info", payment: "Payment" };

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) { return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10); }
function when(iso) { return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; }
function personName(p) { return p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || "—" : "—"; }

const RANGE_PRESETS = [
  { key: "today", label: "Today", from: today, to: today },
  { key: "7d", label: "Last 7 days", from: () => daysAgo(6), to: today },
  { key: "30d", label: "Last 30 days", from: () => daysAgo(29), to: today },
  { key: "mtd", label: "This month", from: () => `${today().slice(0, 7)}-01`, to: today },
];

export default function ReportsEmail() {
  const { notify } = useToast();
  const [tab, setTab] = useState("analytics");
  const [range, setRange] = useState({ preset: "30d", from: daysAgo(29), to: today() });
  const [options, setOptions] = useState({ campaigns: [], agents: [], templates: [], statuses: [], email_types: [] });
  const [filters, setFilters] = useState({ campaign_id: "", agent_id: "", template_id: "", email_type: "", status: "", search: "" });

  useEffect(() => {
    emailService.filterOptions().then((r) => setOptions(r?.data || {})).catch(() => {});
  }, []);

  const params = useMemo(() => ({
    date_from: range.from, date_to: range.to,
    ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
    ...(filters.agent_id ? { agent_id: filters.agent_id } : {}),
    ...(filters.template_id ? { template_id: filters.template_id } : {}),
    ...(filters.email_type ? { email_type: filters.email_type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  }), [range, filters]);

  const applyPreset = (p) => {
    const preset = RANGE_PRESETS.find((x) => x.key === p);
    if (preset) setRange({ preset: p, from: preset.from(), to: preset.to() });
  };

  return (
    <div>
      <ScreenHeader category="Reports" title="Email Reports" />
      <div className="border-b border-[var(--color-border)] px-8">
        <div className="flex gap-1">
          {[["analytics", "Analytics"], ["activity", "Activity"], ["suppressions", "Suppressions"]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-8">
        {tab !== "suppressions" && <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1.5">
            {RANGE_PRESETS.map((p) => (
              <button key={p.key} onClick={() => applyPreset(p.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${range.preset === p.key ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">From</span>
            <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, preset: "custom", from: e.target.value }))} className="input-field py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">To</span>
            <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, preset: "custom", to: e.target.value }))} className="input-field py-1.5 text-sm" />
          </label>
          <Select label="Campaign" value={filters.campaign_id} onChange={(v) => setFilters((f) => ({ ...f, campaign_id: v }))} options={options.campaigns?.map((c) => ({ value: c.id, label: c.name })) || []} />
          <Select label="Agent" value={filters.agent_id} onChange={(v) => setFilters((f) => ({ ...f, agent_id: v }))} options={options.agents?.map((a) => ({ value: a.id, label: personName(a) })) || []} />
          <Select label="Template" value={filters.template_id} onChange={(v) => setFilters((f) => ({ ...f, template_id: v }))} options={options.templates?.map((t) => ({ value: t.id, label: t.name })) || []} />
          <Select label="Email type" value={filters.email_type} onChange={(v) => setFilters((f) => ({ ...f, email_type: v }))} options={options.email_types?.map((t) => ({ value: t.value, label: t.label })) || []} />
          {tab === "activity" && (
            <Select label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={(options.statuses || []).map((s) => ({ value: s, label: s }))} />
          )}
        </div>}

        {tab === "analytics" && <AnalyticsTab params={params} notify={notify} />}
        {tab === "activity" && <ActivityTab params={params} filters={filters} setFilters={setFilters} notify={notify} />}
        {tab === "suppressions" && <SuppressionsTab notify={notify} />}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field py-1.5 text-sm">
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function AnalyticsTab({ params, notify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    emailService.analytics(params)
      .then((r) => { if (!cancelled) setData(r?.data || null); })
      .catch((err) => { if (!cancelled) notify(err?.response?.data?.message || "Could not load analytics.", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params, notify]);

  if (loading) return <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>;
  if (!data) return <EmptyState icon={Mail} title="No data" description="No emails match these filters." />;

  const t = data.totals;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Sent" value={t.sent} />
        <Stat label="Delivered" value={t.delivered} sub={`${t.delivery_rate}%`} />
        <Stat label="Opened" value={t.opened} sub={`${t.open_rate}% of delivered`} />
        <Stat label="Clicked" value={t.clicked} sub={`${t.click_rate}% of delivered`} />
        <Stat label="Bounced" value={t.bounced} sub={`${t.bounce_rate}%`} danger={t.bounced > 0} />
        <Stat label="Failed" value={t.failed} danger={t.failed > 0} />
        <Stat label="Unsubscribed" value={t.unsubscribed} />
        <Stat label="Spam complaints" value={t.complained} danger={t.complained > 0} />
        <Stat label="Total opens" value={t.total_opens} />
        <Stat label="Total clicks" value={t.total_clicks} />
        <Stat label="Click-to-open" value={`${t.click_to_open_rate}%`} />
      </div>
      {data.capped && (
        <p className="text-xs text-[var(--color-warning)]">Showing the first 50,000 emails in this window — narrow the date range for exact totals.</p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">By Email Type</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Information sent" value={t.information_sent} />
          <Stat label="Information opened" value={t.information_opened} />
          <Stat label="Information clicked" value={t.information_clicked} />
          <Stat label="Payment emails sent" value={t.payment_sent} />
          <Stat label="Payment emails opened" value={t.payment_opened} />
          <Stat label="Payment links clicked" value={t.payment_link_clicked} sub={`${t.payment_link_click_rate}% of delivered`} />
        </div>
      </div>

      <BreakdownTable title="By Campaign" rows={data.by_campaign} nameKey="campaign_name" />
      <BreakdownTable title="By Agent" rows={data.by_agent} nameKey="agent_name" />
    </div>
  );
}

function Stat({ label, value, sub, danger }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-3">
      <p className={`text-xl font-semibold ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}>{value ?? 0}</p>
      <p className="text-[11px] text-[var(--color-text-tertiary)]">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">{sub}</p>}
    </div>
  );
}

function BreakdownTable({ title, rows, nameKey }) {
  if (!rows?.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg)] text-left text-[11px] uppercase text-[var(--color-text-tertiary)]">
            <tr>
              <th className="px-3 py-2">{title.replace("By ", "")}</th>
              <th className="px-3 py-2 text-right">Sent</th>
              <th className="px-3 py-2 text-right">Delivered</th>
              <th className="px-3 py-2 text-right">Opened</th>
              <th className="px-3 py-2 text-right">Clicked</th>
              <th className="px-3 py-2 text-right">Bounced</th>
              <th className="px-3 py-2 text-right">Open %</th>
              <th className="px-3 py-2 text-right">Click %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">{r[nameKey]}</td>
                <td className="px-3 py-2 text-right">{r.sent}</td>
                <td className="px-3 py-2 text-right">{r.delivered}</td>
                <td className="px-3 py-2 text-right">{r.opened}</td>
                <td className="px-3 py-2 text-right">{r.clicked}</td>
                <td className={`px-3 py-2 text-right ${r.bounced > 0 ? "text-[var(--color-danger)]" : ""}`}>{r.bounced}</td>
                <td className="px-3 py-2 text-right">{r.open_rate}%</td>
                <td className="px-3 py-2 text-right">{r.click_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SUPP_REASON = {
  hard_bounce: "Hard bounce", complaint: "Spam complaint", unsubscribe: "Unsubscribed", manual: "Added manually",
};

function SuppressionsTab({ notify }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emailService.listSuppressions({ page, page_size: PAGE_SIZE, ...(search ? { search } : {}), ...(reason ? { reason } : {}) });
      setRows(res?.data?.suppressions || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load the suppression list.", "error");
    } finally { setLoading(false); }
  }, [page, search, reason, notify]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await emailService.addSuppression(newEmail.trim());
      notify(`${newEmail.trim()} suppressed.`, "success");
      setNewEmail("");
      setPage(1); load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not add that address.", "error");
    } finally { setAdding(false); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Allow emails to ${row.email} again? This removes it from the suppression list.`)) return;
    try {
      await emailService.removeSuppression(row.id);
      notify(`${row.email} removed.`, "success");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not remove that entry.", "error");
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-tertiary)]">
        Emails are never sent to an address on this list. Hard bounces, spam complaints and unsubscribes are added
        automatically from Telnyx events; you can also add an address by hand, or remove one that was suppressed by mistake.
      </p>

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="address@example.com" className="input-field max-w-xs py-1.5 text-sm" />
        <button type="submit" disabled={adding} className="btn-outline py-1.5 text-sm"><Plus size={13} /> Suppress address</button>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search…" className="input-field py-1.5 pl-7 text-sm" />
        </div>
        <select value={reason} onChange={(e) => { setPage(1); setReason(e.target.value); }} className="input-field py-1.5 text-sm">
          <option value="">All reasons</option>
          {Object.entries(SUPP_REASON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={ShieldOff} title="Nothing suppressed" description="No addresses are blocked from receiving email." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg)] text-left text-[11px] uppercase text-[var(--color-text-tertiary)]">
                <tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Added</th><th className="px-3 py-2" /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2 text-[var(--color-text-primary)]">{r.email}</td>
                    <td className="px-3 py-2 text-[var(--color-text-tertiary)]">{SUPP_REASON[r.reason] || r.reason}</td>
                    <td className="px-3 py-2 text-[var(--color-text-tertiary)]">{when(r.created_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => remove(r)} title="Remove" className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-tint)] hover:text-[var(--color-danger)]">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>{total.toLocaleString()} addresses</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span>Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActivityTab({ params, filters, setFilters, notify }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState(filters.search || "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emailService.listMessages({ ...params, page, page_size: PAGE_SIZE });
      setRows(res?.data?.messages || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load email activity.", "error");
    } finally {
      setLoading(false);
    }
  }, [params, page, notify]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [params]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => { e.preventDefault(); setFilters((f) => ({ ...f, search: searchDraft.trim() })); }}
        className="flex gap-2"
      >
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Recipient email…" className="input-field py-1.5 pl-8 text-sm" />
        </div>
        <button type="submit" className="btn-outline py-1.5 text-sm">Search</button>
        {filters.search && (
          <button type="button" onClick={() => { setSearchDraft(""); setFilters((f) => ({ ...f, search: "" })); }} className="btn-outline py-1.5 text-sm">
            <X size={13} /> Clear
          </button>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Mail} title="No emails" description="Nothing matches these filters." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg)] text-left text-[11px] uppercase text-[var(--color-text-tertiary)]">
                <tr>
                  <th className="px-3 py-2">Recipient</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Campaign</th>
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Sent</th>
                  <th className="px-3 py-2 text-right">Opens / Clicks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const [label, color] = STATUS_META[m.status] || [m.status, "#6B7280"];
                  return (
                    <tr key={m.id} className="border-t border-[var(--color-border)]">
                      <td className="px-3 py-2 text-[var(--color-text-secondary)]">{m.recipient_email}</td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-[var(--color-text-primary)]">{m.subject}</td>
                      <td className="px-3 py-2">{EMAIL_TYPE_LABEL[m.email_type] ? (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
                          {EMAIL_TYPE_LABEL[m.email_type]}
                        </span>
                      ) : <span className="text-[var(--color-text-tertiary)]">—</span>}</td>
                      <td className="px-3 py-2 text-[var(--color-text-tertiary)]">{m.campaign?.name || "—"}</td>
                      <td className="px-3 py-2 text-[var(--color-text-tertiary)]">{personName(m.agent)}</td>
                      <td className="px-3 py-2 text-[var(--color-text-tertiary)]">{m.template?.name || "—"}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{label}
                        </span>
                        {m.failed_reason && m.status === "failed" && (
                          <span className="ml-1 text-[10px] text-[var(--color-text-tertiary)]">— {m.failed_reason}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[var(--color-text-tertiary)]">{when(m.sent_at || m.created_at)}</td>
                      <td className="px-3 py-2 text-right text-[var(--color-text-tertiary)]">
                        {m.open_count || 0} / {m.click_count || 0}
                        {(m.payment_link_click_count || 0) > 0 && (
                          <span className="ml-1 text-[10px] font-medium text-[var(--color-success)]">· pay ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>{total.toLocaleString()} emails</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span>Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
