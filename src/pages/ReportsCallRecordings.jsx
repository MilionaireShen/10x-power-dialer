import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Download, RefreshCw, AlertTriangle, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import recordingService from "../services/recordingService";

// Mirrors recording_sessions.status. 'incomplete' is shown distinctly from
// 'completed' on purpose: audio exists and plays, but chunks are known to be
// missing, and presenting that as complete would misrepresent the file.
const STATUS_META = {
  completed: { dot: "#059669", label: "Completed" },
  recording: { dot: "#D97706", label: "Recording…" },
  finalizing: { dot: "#D97706", label: "Processing" },
  initializing: { dot: "#D97706", label: "Starting…" },
  interrupted: { dot: "#EA580C", label: "Interrupted" },
  incomplete: { dot: "#EA580C", label: "Incomplete" },
  failed: { dot: "#DC2626", label: "Failed" },
};

const DATE_PRESETS = [
  { value: "", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7", label: "Last 7 Days" },
  { value: "last_30", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range…" },
];

const EMPTY_FILTERS = {
  search: "",
  agent_id: "",
  disposition: "",
  duration: "",
  min_seconds: "",
  max_seconds: "",
  status: "",
  campaign_id: "",
  date_preset: "",
  date_from: "",
  date_to: "",
};

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label className="flex min-w-[150px] flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field py-2 text-sm">
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function ReportsCallRecordings() {
  const { notify } = useToast();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Separate from `filters` so typing doesn't fire a request per keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [options, setOptions] = useState({ dispositions: [], agents: [], campaigns: [], statuses: [], durations: [] });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, page_size: 25, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    recordingService
      .filterOptions()
      .then((res) => setOptions(res?.data ?? {}))
      .catch(() => {
        // A failed options load leaves the dropdowns empty rather than
        // falling back to invented values that don't exist in this company.
      });
  }, []);

  // Debounced so the request follows the typing rather than racing it.
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    // Only non-empty filters are sent, so the query string stays readable and
    // the backend doesn't have to treat "" as a value.
    const params = { page, page_size: meta.page_size };
    for (const [k, v] of Object.entries(filters)) {
      if (v !== "" && v !== null && v !== undefined) params[k] = v;
    }
    recordingService
      .list(params)
      .then((res) => {
        setRows(res?.data ?? []);
        if (res?.meta) setMeta((m) => ({ ...m, ...res.meta }));
        setError(null);
      })
      .catch((err) => setError(err?.message || "Could not load recordings."))
      .finally(() => setLoading(false));
    // meta.page_size is intentionally read, not depended on — changing it
    // would otherwise retrigger this on every response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  useEffect(() => load(), [load]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1); // a narrowed result set makes the old page number meaningless
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setPage(1);
  };

  // Drives both the "Clear Filters" affordance and the active-filter chips.
  const activeFilters = useMemo(() => {
    const labelFor = (key, value) => {
      const find = (list) => list?.find((o) => o.value === value)?.label;
      switch (key) {
        case "agent_id": return `Agent: ${find(options.agents) || value}`;
        case "disposition": return `Disposition: ${find(options.dispositions) || value}`;
        case "duration": return `Duration: ${find(options.durations) || value}`;
        case "status": return `Status: ${find(options.statuses) || value}`;
        case "campaign_id": return `Campaign: ${find(options.campaigns) || value}`;
        case "date_preset": return `Date: ${DATE_PRESETS.find((d) => d.value === value)?.label || value}`;
        case "search": return `Search: "${value}"`;
        case "min_seconds": return `Min: ${value}s`;
        case "max_seconds": return `Max: ${value}s`;
        case "date_from": return `From: ${value}`;
        case "date_to": return `To: ${value}`;
        default: return `${key}: ${value}`;
      }
    };
    return Object.entries(filters)
      .filter(([, v]) => v !== "" && v !== null && v !== undefined)
      .map(([k, v]) => ({ key: k, label: labelFor(k, v) }));
  }, [filters, options]);

  const play = async (session) => {
    if (playingId === session.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    try {
      const res = await recordingService.playUrl(session.id);
      const url = res?.data?.url;
      if (!url) throw new Error("No playback URL returned.");
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      audioRef.current.onended = () => setPlayingId(null);
      await audioRef.current.play();
      setPlayingId(session.id);
    } catch (err) {
      notify(err?.message || "Could not play this recording.", "error");
    }
  };

  const download = async (session) => {
    try {
      const res = await recordingService.downloadUrl(session.id);
      const url = res?.data?.url;
      if (!url) throw new Error("No download URL returned.");
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      notify(err?.message || "Could not download this recording.", "error");
    }
  };

  useEffect(() => () => audioRef.current?.pause(), []);

  const playable = (s) => ["completed", "incomplete", "interrupted"].includes(s.status) && s.storage_path;
  const showingFrom = meta.total === 0 ? 0 : (meta.page - 1) * meta.page_size + 1;
  const showingTo = Math.min(meta.page * meta.page_size, meta.total);

  return (
    <div>
      <ScreenHeader category="Reports" title="Call Recordings" />
      <div className="p-8">
        {/* FILTERS */}
        <div className="card mb-4 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by phone number, agent, campaign, or recording ID…"
              className="input-field w-full py-2 pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {options.agents?.length > 0 && (
              <Select label="Agent" value={filters.agent_id} onChange={(v) => setFilter("agent_id", v)}
                options={options.agents} placeholder="All Agents" />
            )}
            <Select label="Disposition" value={filters.disposition} onChange={(v) => setFilter("disposition", v)}
              options={options.dispositions || []} placeholder="All Dispositions" />
            <Select label="Duration" value={filters.duration} onChange={(v) => setFilter("duration", v)}
              options={options.durations || []} placeholder="All Durations" />
            <Select label="Date" value={filters.date_preset} onChange={(v) => setFilter("date_preset", v)}
              options={DATE_PRESETS.filter((d) => d.value)} placeholder="All Dates" />
            <Select label="Status" value={filters.status} onChange={(v) => setFilter("status", v)}
              options={options.statuses || []} placeholder="All Statuses" />
            {options.campaigns?.length > 0 && (
              <Select label="Campaign" value={filters.campaign_id} onChange={(v) => setFilter("campaign_id", v)}
                options={options.campaigns} placeholder="All Campaigns" />
            )}
          </div>

          {/* Custom inputs appear only when their preset is chosen, so the bar
              stays compact for the common case. */}
          {filters.date_preset === "custom" && (
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Start Date</span>
                <input type="date" value={filters.date_from} onChange={(e) => setFilter("date_from", e.target.value)} className="input-field py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">End Date</span>
                <input type="date" value={filters.date_to} onChange={(e) => setFilter("date_to", e.target.value)} className="input-field py-2 text-sm" />
              </label>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-medium text-[var(--color-accent)]">Custom duration range</summary>
            <div className="mt-2 flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Min (seconds)</span>
                <input type="number" min="0" value={filters.min_seconds} onChange={(e) => setFilter("min_seconds", e.target.value)}
                  placeholder="e.g. 120" className="input-field w-36 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Max (seconds)</span>
                <input type="number" min="0" value={filters.max_seconds} onChange={(e) => setFilter("max_seconds", e.target.value)}
                  placeholder="e.g. 480" className="input-field w-36 py-2 text-sm" />
              </label>
              <p className="self-end pb-2 text-[11px] text-[var(--color-text-tertiary)]">Overrides the Duration dropdown when set.</p>
            </div>
          </details>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Active:</span>
              {activeFilters.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key, "")}
                  className="pill bg-[var(--color-accent-tint)] text-[11px] text-[var(--color-accent)] hover:opacity-80"
                  title="Remove this filter">
                  {f.label} <X size={11} />
                </button>
              ))}
              <button onClick={clearFilters} className="btn-gray ml-auto text-xs">Clear Filters</button>
            </div>
          )}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {loading ? "Loading…" : meta.total === 0 ? "No results" : `Showing ${showingFrom}–${showingTo} of ${meta.total}`}
          </p>
          <button onClick={load} className="btn-gray text-xs"><RefreshCw size={13} /> Refresh</button>
        </div>

        {error && (
          <div className="card mb-4 flex items-center gap-2 border-l-4 border-[var(--color-danger)] text-sm text-[var(--color-danger)]">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {!loading && rows.length === 0 && !error && (
          <EmptyState
            title={activeFilters.length ? "No recordings match these filters" : "No recordings yet"}
            description={
              activeFilters.length
                ? "Try widening the date range or clearing a filter."
                : "Recordings appear here once an agent completes a call. Both sides of the conversation are captured."
            }
            actionLabel={activeFilters.length ? "Clear Filters" : undefined}
            onAction={activeFilters.length ? clearFilters : undefined}
          />
        )}

        {rows.length > 0 && (
          <>
            <div className="card divide-y divide-[var(--color-border)] p-0">
              {rows.map((s) => {
                const metaStatus = STATUS_META[s.status] ?? STATUS_META.failed;
                const canPlay = playable(s);
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                    <button onClick={() => play(s)} disabled={!canPlay}
                      title={canPlay ? "Play recording" : `Not playable — ${metaStatus.label}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent)] enabled:hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30">
                      {playingId === s.id ? <Pause size={14} /> : <Play size={14} />}
                    </button>

                    <div className="min-w-[160px]">
                      <p className="font-medium text-[var(--color-text-primary)]">{s.agent_name || "Unknown agent"}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">{formatWhen(s.started_at)}</p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--color-text-secondary)]">
                        {s.direction === "inbound" ? "←" : "→"} {s.to_number || "—"}
                        {s.campaign_name ? ` · ${s.campaign_name}` : ""}
                      </p>
                      {(s.status === "interrupted" || s.status === "incomplete") && (
                        <p className="text-[11px] text-[#EA580C]">
                          Recording interrupted — {formatDuration(s.captured_seconds)} captured
                        </p>
                      )}
                      {s.status === "failed" && s.error && (
                        <p className="truncate text-[11px] text-[var(--color-danger)]">{s.error}</p>
                      )}
                    </div>

                    {s.disposition && (
                      <span className="pill shrink-0 bg-[var(--color-bg)] text-[11px] text-[var(--color-text-secondary)]">
                        {s.disposition.replace(/_/g, " ")}
                      </span>
                    )}

                    <span className="pill shrink-0 text-[11px]"
                      style={{ backgroundColor: `color-mix(in srgb, ${metaStatus.dot} 14%, white)`, color: metaStatus.dot }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: metaStatus.dot }} />
                      {metaStatus.label}
                    </span>

                    <span className="w-14 shrink-0 text-right font-mono text-sm text-[var(--color-text-secondary)]">
                      {formatDuration(s.captured_seconds)}
                    </span>

                    <button onClick={() => download(s)} disabled={!canPlay}
                      title={canPlay ? "Download recording" : `Not available — ${metaStatus.label}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-tertiary)] enabled:hover:bg-[var(--color-bg)] enabled:hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-30">
                      <Download size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {meta.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1} className="btn-gray text-xs disabled:opacity-40">
                  <ChevronLeft size={13} /> Previous
                </button>
                <span className="text-sm text-[var(--color-text-secondary)]">Page {meta.page} of {meta.total_pages}</span>
                <button onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))} disabled={meta.page >= meta.total_pages} className="btn-gray text-xs disabled:opacity-40">
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
