import { useCallback, useEffect, useState } from "react";
import { Search, Users, ChevronLeft, ChevronRight, X, Phone, MessageSquare, CalendarDays, Ban, Mail } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import SidePanel from "../components/SidePanel";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";
import emailService from "../services/emailService";

const PAGE_SIZE = 25;
const EMPTY = { search: "", lead_list_id: "", campaign_id: "", status: "", is_dnc: "" };

function leadName(l) {
  return [l.first_name, l.last_name].filter(Boolean).join(" ") || "Unnamed lead";
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LeadsSearch() {
  const { notify } = useToast();
  const [filters, setFilters] = useState(EMPTY);
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({ campaigns: [], lead_lists: [], statuses: [] });
  const [openLead, setOpenLead] = useState(null);

  useEffect(() => {
    adminService.leadFilterOptions()
      .then((res) => setOptions(res?.data || {}))
      .catch(() => { /* the table works without the dropdowns */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: PAGE_SIZE };
      for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
      const res = await adminService.listLeads(params);
      setLeads(res?.data?.leads || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load leads.";
      setError(message);
      notify(message, "error");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, notify]);

  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const set = (key, value) => { setPage(1); setFilters((f) => ({ ...f, [key]: value })); };
  const activeCount = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <ScreenHeader category="Leads" title="Lead Search" />
      <div className="space-y-4 p-8">
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Name, phone, email or city…"
                className="input-field py-2 pl-9 text-sm"
              />
            </div>
            {activeCount > 0 && (
              <button onClick={() => { setFilters(EMPTY); setPage(1); }} className="btn-outline shrink-0 py-2 text-sm">
                <X size={14} /> Clear ({activeCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="Lead List">
              <select value={filters.lead_list_id} onChange={(e) => set("lead_list_id", e.target.value)} className="input-field py-2 text-sm">
                <option value="">All lists</option>
                {(options.lead_lists || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Campaign">
              <select value={filters.campaign_id} onChange={(e) => set("campaign_id", e.target.value)} className="input-field py-2 text-sm">
                <option value="">All campaigns</option>
                {(options.campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={filters.status} onChange={(e) => set("status", e.target.value)} className="input-field py-2 text-sm">
                <option value="">All</option>
                {(options.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="DNC">
              <select value={filters.is_dnc} onChange={(e) => set("is_dnc", e.target.value)} className="input-field py-2 text-sm">
                <option value="">All</option>
                <option value="true">On the DNC list</option>
                <option value="false">Callable</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="card overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading leads…</p>
          ) : error ? (
            <div className="p-8"><EmptyState icon={Users} title="Could not load leads" description={error} /></div>
          ) : leads.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title={activeCount ? "No leads match this search" : "No leads found"}
                description={activeCount ? "Try widening the filters." : "Upload a lead list to get started."}
              />
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Last Disposition</th>
                  <th className="px-5 py-3 font-medium">Times Called</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => (
                  <tr
                    key={l.id}
                    onClick={() => setOpenLead(l.id)}
                    className={`cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-accent-tint)] ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}
                  >
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">
                      <span className="flex items-center gap-1.5">
                        {leadName(l)}
                        {l.is_dnc && <Ban size={12} className="text-[var(--color-danger)]" title="On the DNC list" />}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[var(--color-text-secondary)]">{l.phone_number}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">
                      {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{l.campaign?.name || "—"}</td>
                    <td className="px-5 py-3.5">
                      {l.last_disposition
                        ? <span className="pill bg-[var(--color-bg)] text-[var(--color-text-secondary)]">{l.last_disposition}</span>
                        : <span className="text-xs text-[var(--color-text-tertiary)]">Never contacted</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.times_called ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
            <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} className="btn-outline py-1.5 disabled:opacity-40">
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs text-[var(--color-text-tertiary)]">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages} className="btn-outline py-1.5 disabled:opacity-40">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <LeadDetail leadId={openLead} onClose={() => setOpenLead(null)} />
    </div>
  );
}

/** Everything that has actually happened to one lead. */
function LeadDetail({ leadId, onClose }) {
  const { notify } = useToast();
  const [data, setData] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) { setData(null); setEmails([]); return; }
    setLoading(true);
    adminService.leadDetail(leadId)
      .then((res) => setData(res?.data || null))
      .catch((err) => notify(err?.response?.data?.message || "Could not open that lead.", "error"))
      .finally(() => setLoading(false));
    emailService.listForLead(leadId)
      .then((res) => setEmails(res?.data?.emails || []))
      .catch(() => setEmails([]));
  }, [leadId, notify]);

  if (!leadId) return null;
  const lead = data?.lead;

  return (
    <SidePanel
      open={Boolean(leadId)}
      onClose={onClose}
      title={lead ? leadName(lead) : "Lead"}
      subtitle={lead?.phone_number}
      widthClass="max-w-xl"
    >
      {loading ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      ) : !lead ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">Lead unavailable.</p>
      ) : (
        <div className="space-y-6">
          <dl className="space-y-2 text-sm">
            <Row label="Email" value={lead.email} />
            <Row label="Address" value={[lead.street_address, lead.city, lead.state, lead.zip_code].filter(Boolean).join(", ")} />
            <Row label="Campaign" value={lead.campaign?.name} />
            <Row label="Lead list" value={lead.lead_list?.name} />
            <Row label="Status" value={lead.status} />
            <Row label="Times called" value={String(lead.times_called ?? 0)} />
            <Row label="Last disposition" value={lead.last_disposition} />
            <Row label="Added" value={lead.created_at ? new Date(lead.created_at).toLocaleDateString() : null} />
          </dl>

          {data.dnc && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-tint)] px-3 py-2.5 text-xs text-[var(--color-danger)]">
              <Ban size={14} className="mt-px shrink-0" />
              On the DNC list{data.dnc.reason ? ` — ${data.dnc.reason}` : ""}. Outbound calls to this number are blocked.
            </div>
          )}

          <Section icon={Phone} title="Calls" count={data.calls.length}>
            {data.calls.length === 0
              ? <Empty>No calls to this lead yet.</Empty>
              : data.calls.slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-xs last:border-0">
                  <span className="text-[var(--color-text-secondary)]">{new Date(c.started_at).toLocaleString()}</span>
                  <span className="text-[var(--color-text-tertiary)]">
                    {c.direction} · {formatDuration(c.duration_seconds)} · {c.disposition || c.status}
                  </span>
                </div>
              ))}
          </Section>

          <Section icon={MessageSquare} title="SMS conversations" count={data.conversations.length}>
            {data.conversations.length === 0
              ? <Empty>No messages exchanged with this lead.</Empty>
              : data.conversations.map((c) => (
                <div key={c.id} className="border-b border-[var(--color-border)] py-2 text-xs last:border-0">
                  <p className="truncate text-[var(--color-text-secondary)]">{c.last_message_preview}</p>
                  <p className="text-[var(--color-text-tertiary)]">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "—"}
                  </p>
                </div>
              ))}
          </Section>

          <Section icon={Mail} title="Emails" count={emails.length}>
            {emails.length === 0
              ? <Empty>No emails sent to this lead.</Empty>
              : emails.map((e) => (
                <div key={e.id} className="border-b border-[var(--color-border)] py-2 text-xs last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-[var(--color-text-primary)]">{e.subject}</span>
                    <EmailStatusPill status={e.status} />
                  </div>
                  <p className="mt-0.5 text-[var(--color-text-tertiary)]">
                    {e.template?.name ? `${e.template.name} · ` : ""}
                    {e.sent_at ? new Date(e.sent_at).toLocaleString() : new Date(e.created_at).toLocaleString()}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                    {e.delivered_at && <span>Delivered {new Date(e.delivered_at).toLocaleTimeString()}</span>}
                    {e.first_opened_at && <span>Opened {new Date(e.first_opened_at).toLocaleTimeString()}{e.open_count > 1 ? ` (${e.open_count}×)` : ""}</span>}
                    {e.first_clicked_at && <span>Clicked {new Date(e.first_clicked_at).toLocaleTimeString()}{e.click_count > 1 ? ` (${e.click_count}×)` : ""}</span>}
                    {e.bounced_at && <span className="text-[var(--color-danger)]">Bounced</span>}
                    {e.failed_at && <span className="text-[var(--color-danger)]">Failed{e.failed_reason ? ` — ${e.failed_reason}` : ""}</span>}
                    {e.payment_link && <span>Payment link sent</span>}
                  </div>
                </div>
              ))}
          </Section>

          <Section icon={CalendarDays} title="Appointments" count={data.appointments.length}>
            {data.appointments.length === 0
              ? <Empty>No appointments booked.</Empty>
              : data.appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-xs last:border-0">
                  <span className="text-[var(--color-text-secondary)]">
                    {a.scheduled_at ? new Date(a.scheduled_at).toLocaleString() : "No time set"}
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">{a.confirmation_status?.replace(/_/g, " ")}</span>
                </div>
              ))}
          </Section>
        </div>
      )}
    </SidePanel>
  );
}

function Section({ icon: Icon, title, count, children }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
        <Icon size={13} /> {title} <span className="font-normal text-[var(--color-text-tertiary)]">({count})</span>
      </p>
      <div className="rounded-lg border border-[var(--color-border)] px-3">{children}</div>
    </div>
  );
}

function Empty({ children }) {
  return <p className="py-3 text-xs text-[var(--color-text-tertiary)]">{children}</p>;
}

const EMAIL_STATUS = {
  queued: ["Queued", "info"], sent: ["Sent", "info"], delivered: ["Delivered", "success"],
  opened: ["Opened", "success"], clicked: ["Clicked", "success"],
  bounced: ["Bounced", "danger"], failed: ["Failed", "danger"], deferred: ["Deferred", "warning"],
  unsubscribed: ["Unsubscribed", "warning"], complained: ["Spam complaint", "danger"],
};
function EmailStatusPill({ status }) {
  const [label, tone] = EMAIL_STATUS[status] || [status || "—", "info"];
  return (
    <span
      className="pill shrink-0"
      style={{ backgroundColor: `var(--color-${tone}-tint)`, color: `var(--color-${tone})` }}
    >
      {label}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5 last:border-0">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="font-medium text-[var(--color-text-primary)]">{value || "—"}</dd>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</span>
      {children}
    </label>
  );
}
