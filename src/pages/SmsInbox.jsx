import { useCallback, useEffect, useState } from "react";
import { Search, X, ChevronLeft, ChevronRight, Ban, MessageSquare } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import SmsConversation, { ConversationPlaceholder } from "../components/SmsConversation";
import { useToast } from "../lib/ToastContext";
import smsService from "../services/smsService";

const FILTERS = [
  { value: "", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "awaiting_reply", label: "Awaiting Reply" },
  { value: "confirmed", label: "Confirmed" },
  { value: "failed", label: "Failed" },
  { value: "opted_out", label: "Opted Out" },
];

const PAGE_SIZE = 25;

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SmsInbox() {
  const { notify } = useToast();
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [options, setOptions] = useState({ campaigns: [], agents: [] });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    smsService.filterOptions()
      .then((res) => setOptions(res?.data || {}))
      .catch(() => { /* the inbox works without the dropdowns */ });
  }, []);

  // Filtering, paging and ordering all happen in Postgres. The browser holds
  // one page of threads, never the company's whole message history.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (filter) params.filter = filter;
      if (search) params.search = search;
      if (campaignId) params.campaign_id = campaignId;
      if (agentId) params.agent_id = agentId;
      const res = await smsService.listConversations(params);
      setConversations(res?.data?.conversations || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load conversations.", "error");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search, campaignId, agentId, notify]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  // Keeps the list's unread badges current while the agent reads a thread.
  useEffect(() => {
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const hasFilters = Boolean(filter || search || campaignId || agentId);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader category="Call Center" title="SMS Inbox" />

      <div className="flex flex-1 gap-4 overflow-hidden p-8 pt-4">
        {/* ---- Thread list ---- */}
        <div className="flex w-[380px] shrink-0 flex-col gap-3">
          <div className="card space-y-3 p-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                placeholder="Search name or number…"
                className="input-field py-2 pl-9 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setPage(1); setFilter(f.value); }}
                  className={`pill transition-colors ${
                    filter === f.value
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={campaignId}
                onChange={(e) => { setPage(1); setCampaignId(e.target.value); }}
                className="input-field py-1.5 text-xs"
              >
                <option value="">All campaigns</option>
                {(options.campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={agentId}
                onChange={(e) => { setPage(1); setAgentId(e.target.value); }}
                className="input-field py-1.5 text-xs"
              >
                <option value="">All agents</option>
                {(options.agents || []).map((a) => (
                  <option key={a.id} value={a.id}>{[a.first_name, a.last_name].filter(Boolean).join(" ")}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={() => { setFilter(""); setSearch(""); setCampaignId(""); setAgentId(""); setPage(1); }}
                className="btn-outline w-full py-1.5 text-xs"
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </div>

          <div className="card flex-1 overflow-y-auto p-0">
            {loading && conversations.length === 0 ? (
              <p className="p-6 text-sm text-[var(--color-text-tertiary)]">Loading…</p>
            ) : conversations.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={MessageSquare}
                  title={hasFilters ? "No conversations match" : "No conversations yet"}
                  description={hasFilters ? "Try clearing the filters." : "Threads appear here as soon as an agent texts a customer or a customer replies."}
                />
              </div>
            ) : (
              conversations.map((c) => {
                const name = [c.lead?.first_name, c.lead?.last_name].filter(Boolean).join(" ");
                const unread = c.unread_count > 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`block w-full border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--color-bg)] ${
                      selected === c.id ? "bg-[var(--color-accent-tint)]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${unread ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-primary)]"}`}>
                        {name || c.contact_number}
                      </p>
                      <span className="shrink-0 text-[11px] text-[var(--color-text-tertiary)]">{relativeTime(c.last_message_at)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                      {c.last_message_direction === "outbound" && <span className="text-[var(--color-text-tertiary)]">You: </span>}
                      {c.last_message_preview || "No messages yet"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {c.campaign?.name && (
                        <span className="pill bg-[var(--color-bg)] text-[10px] text-[var(--color-text-tertiary)]">{c.campaign.name}</span>
                      )}
                      {c.opted_out && (
                        <span className="pill inline-flex items-center gap-1 text-[10px]" style={{ backgroundColor: "var(--color-danger-tint)", color: "var(--color-danger)" }}>
                          <Ban size={9} /> Opted out
                        </span>
                      )}
                      {unread && (
                        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-semibold text-white">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-1 text-xs text-[var(--color-text-secondary)]">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} className="btn-outline py-1 disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              <span>Page {page} of {totalPages} · {total} total</span>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages} className="btn-outline py-1 disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ---- Thread ---- */}
        <div className="card flex-1 overflow-hidden p-0">
          {selected ? <SmsConversation conversationId={selected} onChanged={load} /> : <ConversationPlaceholder />}
        </div>
      </div>
    </div>
  );
}
