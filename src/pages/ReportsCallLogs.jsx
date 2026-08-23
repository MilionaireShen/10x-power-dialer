import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Phone, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ExportActions from "../components/ExportActions";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";
import dispositionService from "../services/dispositionService";
import campaignService from "../services/campaignService";
import userService from "../services/userService";

const PAGE_SIZE = 25;

const EMPTY = {
  agent_id: "", campaign_id: "", disposition: "", direction: "", status: "",
  search: "", date_from: "", date_to: "",
};

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ReportsCallLogs() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [filters, setFilters] = useState(EMPTY);
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({ agents: [], campaigns: [], dispositions: [] });

  // Filter choices come from the same records the table lists, so a filter can
  // never offer an agent or campaign that does not exist.
  useEffect(() => {
    Promise.all([
      userService.list({ role: "agent" }).catch(() => null),
      campaignService.list().catch(() => null),
      dispositionService.list().catch(() => null),
    ]).then(([agents, campaigns, dispositions]) => {
      setOptions({
        agents: agents?.data || [],
        campaigns: campaigns?.data || [],
        dispositions: dispositions?.data || [],
      });
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: PAGE_SIZE };
      for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
      const res = await adminService.callLogs(params);
      setCalls(res?.data?.calls || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load call logs.";
      setError(message);
      notify(message, "error");
      setCalls([]);
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
      <ScreenHeader category="Reports" title="Call Logs" actions={<ExportActions />} />
      <div className="space-y-4 p-8">
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Search by phone number…"
                className="input-field py-2 pl-9 text-sm"
              />
            </div>
            {activeCount > 0 && (
              <button onClick={() => { setFilters(EMPTY); setPage(1); }} className="btn-outline shrink-0 py-2 text-sm">
                <X size={14} /> Clear ({activeCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Field label="Agent">
              <select value={filters.agent_id} onChange={(e) => set("agent_id", e.target.value)} className="input-field py-2 text-sm">
                <option value="">All Agents</option>
                {options.agents.map((a) => (
                  <option key={a.id} value={a.id}>{[a.first_name, a.last_name].filter(Boolean).join(" ") || a.email}</option>
                ))}
              </select>
            </Field>
            <Field label="Campaign">
              <select value={filters.campaign_id} onChange={(e) => set("campaign_id", e.target.value)} className="input-field py-2 text-sm">
                <option value="">All Campaigns</option>
                {options.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Disposition">
              <select value={filters.disposition} onChange={(e) => set("disposition", e.target.value)} className="input-field py-2 text-sm">
                <option value="">All</option>
                {options.dispositions.map((d) => <option key={d.id} value={d.name}>{d.label || d.name}</option>)}
              </select>
            </Field>
            <Field label="Direction">
              <select value={filters.direction} onChange={(e) => set("direction", e.target.value)} className="input-field py-2 text-sm">
                <option value="">All</option>
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </Field>
            <Field label="From">
              <input type="date" value={filters.date_from} onChange={(e) => set("date_from", e.target.value)} className="input-field py-2 text-sm" />
            </Field>
            <Field label="To">
              <input type="date" value={filters.date_to} onChange={(e) => set("date_to", e.target.value)} className="input-field py-2 text-sm" />
            </Field>
          </div>
        </div>

        <div className="card overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-sm text-[var(--color-text-tertiary)]">Loading call logs…</p>
          ) : error ? (
            <div className="p-8">
              <EmptyState icon={Phone} title="Could not load call logs" description={error} />
            </div>
          ) : calls.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Phone}
                title={activeCount ? "No calls match these filters" : "No calls recorded for this period"}
                description={activeCount ? "Try widening the filters or the date range." : "Calls appear here as agents start dialling."}
              />
            </div>
          ) : (
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">Call Time</th>
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Duration</th>
                  <th className="px-5 py-3 font-medium">Disposition</th>
                  <th className="px-5 py-3 font-medium">Direction</th>
                  <th className="px-5 py-3 font-medium">Recording</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c, i) => (
                  <tr key={c.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[var(--color-text-secondary)]">
                      {new Date(c.started_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{c.agent_name || "—"}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{c.lead_name || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[var(--color-text-tertiary)]">
                      {c.direction === "inbound" ? c.phone_number_from : c.phone_number_called}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{formatDuration(c.duration_seconds)}</td>
                    <td className="px-5 py-3.5">
                      {c.disposition ? (
                        <span className="pill bg-[var(--color-bg)] text-[var(--color-text-secondary)]">{c.disposition}</span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                        {c.direction === "inbound"
                          ? <><ArrowDownLeft size={12} className="text-[var(--color-accent)]" /> Inbound</>
                          : <><ArrowUpRight size={12} className="text-[var(--color-text-tertiary)]" /> Outbound</>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {/* Only offered when the call actually has audio. A play
                          button on a call with no recording promises something
                          that cannot happen. */}
                      {c.recording_url ? (
                        <button
                          onClick={() => navigate("/admin/reports/call-recordings")}
                          title="Open Call Recordings to play this call"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-accent-tint)] hover:text-[var(--color-accent)]"
                        >
                          <Play size={13} />
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)]">None</span>
                      )}
                    </td>
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
