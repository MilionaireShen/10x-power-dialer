import { useCallback, useEffect, useState } from "react";
import { Search, X, ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ExportActions from "../components/ExportActions";
import { useToast } from "../lib/ToastContext";
import smsService from "../services/smsService";

// Telnyx's own delivery states. 'sent' and 'delivered' are deliberately
// distinct: a message Telnyx accepted is not a message a handset received, and
// showing them the same way would tell an agent their customer definitely got
// something that may never have arrived.
const STATUS_META = {
  queued: { dot: "#D97706", label: "Queued" },
  sending: { dot: "#D97706", label: "Sending" },
  sent: { dot: "#2563EB", label: "Sent" },
  delivered: { dot: "#059669", label: "Delivered" },
  delivery_unconfirmed: { dot: "#EA580C", label: "Delivery Unconfirmed" },
  failed: { dot: "#DC2626", label: "Failed" },
  received: { dot: "#7C3AED", label: "Received" },
};

const PAGE_SIZE = 25;

const EMPTY_FILTERS = {
  search: "",
  direction: "",
  status: "",
  campaign_id: "",
  agent_id: "",
  message_type: "",
  date_from: "",
  date_to: "",
};

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function personName(p) {
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
}

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field py-2 text-sm">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default function ReportsSmsLogs() {
  const { notify } = useToast();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({ campaigns: [], agents: [], statuses: [], message_types: [] });

  useEffect(() => {
    smsService.filterOptions()
      .then((res) => setOptions(res?.data || {}))
      .catch(() => { /* the table still works without the dropdowns */ });
  }, []);

  // Every filter is a query parameter, so Postgres does the work. The browser
  // never receives more than one page of a company's message history.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
      const res = await smsService.listMessages(params);
      setMessages(res?.data?.messages || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load SMS logs.", "error");
      setMessages([]);
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
      <ScreenHeader category="Reports" title="SMS Logs" actions={<ExportActions />} />
      <div className="space-y-4 p-8">
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Search message text or phone number…"
                className="input-field py-2 pl-9 text-sm"
              />
            </div>
            {activeCount > 0 && (
              <button onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="btn-outline shrink-0 py-2 text-sm">
                <X size={14} /> Clear ({activeCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Select
              label="Direction" placeholder="All" value={filters.direction} onChange={(v) => set("direction", v)}
              options={[{ value: "outbound", label: "Outbound" }, { value: "inbound", label: "Inbound" }]}
            />
            <Select
              label="Status" placeholder="All" value={filters.status} onChange={(v) => set("status", v)}
              options={(options.statuses || []).map((s) => ({ value: s, label: STATUS_META[s]?.label || s }))}
            />
            <Select
              label="Campaign" placeholder="All" value={filters.campaign_id} onChange={(v) => set("campaign_id", v)}
              options={(options.campaigns || []).map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Agent" placeholder="All" value={filters.agent_id} onChange={(v) => set("agent_id", v)}
              options={(options.agents || []).map((a) => ({ value: a.id, label: personName(a) }))}
            />
            <Select
              label="Type" placeholder="All" value={filters.message_type} onChange={(v) => set("message_type", v)}
              options={(options.message_types || []).map((t) => ({ value: t, label: t.replace(/_/g, " ") }))}
            />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">From</span>
              <input type="date" value={filters.date_from} onChange={(e) => set("date_from", e.target.value)} className="input-field py-2 text-sm" />
            </label>
          </div>
        </div>

        <div className="card overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : messages.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Search}
                title={activeCount ? "No messages match these filters" : "No SMS messages yet"}
                description={activeCount ? "Try widening the filters." : "Messages appear here once agents start texting customers."}
              />
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Message</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m, i) => {
                  const meta = STATUS_META[m.status] || { dot: "#6B7280", label: m.status };
                  const outbound = m.direction === "outbound";
                  return (
                    <tr key={m.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[var(--color-text-secondary)]">{formatWhen(m.created_at)}</td>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{personName(m.agent)}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{personName(m.lead)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[var(--color-text-tertiary)]">
                        <span className="inline-flex items-center gap-1">
                          {outbound
                            ? <ArrowUpRight size={12} className="text-[var(--color-text-tertiary)]" />
                            : <ArrowDownLeft size={12} className="text-[var(--color-accent)]" />}
                          {outbound ? m.to_number : m.from_number}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{m.campaign?.name || "—"}</td>
                      <td className="max-w-xs truncate px-5 py-3.5 text-[var(--color-text-secondary)]" title={m.message_body}>
                        {m.message_body}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-[var(--color-text-secondary)]">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                          {meta.label}
                        </span>
                        {/* The reason is what tells an agent whether the
                            customer could ever have received it. */}
                        {m.status === "failed" && m.failed_reason && (
                          <p className="mt-0.5 max-w-[200px] text-[11px] text-[var(--color-danger)]" title={m.failed_reason}>
                            {m.error_code ? `${m.error_code}: ` : ""}{m.failed_reason}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
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
    </div>
  );
}
