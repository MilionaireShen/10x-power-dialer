import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Download, RefreshCw, AlertTriangle } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import recordingService from "../services/recordingService";

// Mirrors recording_sessions.status. 'incomplete' is shown distinctly from
// 'completed' on purpose: audio exists and is playable, but chunks are known
// to be missing, and presenting that as a complete recording would misrepresent
// what is in the file.
const STATUS_META = {
  completed: { dot: "#059669", label: "Completed" },
  recording: { dot: "#D97706", label: "Recording…" },
  finalizing: { dot: "#D97706", label: "Processing" },
  initializing: { dot: "#D97706", label: "Starting…" },
  interrupted: { dot: "#EA580C", label: "Interrupted" },
  incomplete: { dot: "#EA580C", label: "Incomplete" },
  failed: { dot: "#DC2626", label: "Failed" },
};

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
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

export default function ReportsCallRecordings() {
  const { notify } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    recordingService
      .list({ limit: 100 })
      .then((res) => {
        setSessions(res?.data ?? []);
        setError(null);
      })
      .catch((err) => setError(err?.message || "Could not load recordings."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  // Playback uses a short-lived signed URL fetched per click. The storage
  // bucket is private, so there is no durable URL to embed in the page and
  // nothing here is shareable once it expires.
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
      // The signed URL carries Content-Disposition: attachment from storage,
      // so navigating to it downloads rather than plays.
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

  return (
    <div>
      <ScreenHeader category="Reports" title="Call Recordings" />
      <div className="p-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {loading ? "Loading…" : `${sessions.length} recording${sessions.length === 1 ? "" : "s"}`}
          </p>
          <button onClick={load} className="btn-gray text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {error && (
          <div className="card mb-4 flex items-center gap-2 border-l-4 border-[var(--color-danger)] text-sm text-[var(--color-danger)]">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {!loading && sessions.length === 0 && !error && (
          <EmptyState
            title="No recordings yet"
            description="Recordings appear here once an agent completes a call. Both sides of the conversation are captured."
          />
        )}

        {sessions.length > 0 && (
          <div className="card divide-y divide-[var(--color-border)] p-0">
            {sessions.map((s) => {
              const meta = STATUS_META[s.status] ?? STATUS_META.failed;
              const canPlay = playable(s);
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                  <button
                    onClick={() => play(s)}
                    disabled={!canPlay}
                    title={canPlay ? "Play recording" : `Not playable — ${meta.label}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent)] enabled:hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {playingId === s.id ? <Pause size={14} /> : <Play size={14} />}
                  </button>

                  <div className="min-w-[170px]">
                    <p className="font-medium text-[var(--color-text-primary)]">{s.agent_name || "Unknown agent"}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{formatWhen(s.started_at)}</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--color-text-secondary)]">
                      {s.direction === "inbound" ? "←" : "→"} {s.to_number || "—"}
                      {s.campaign_name ? ` · ${s.campaign_name}` : ""}
                    </p>
                    {/* Stated plainly rather than hidden: an operator needs to
                        know how much of the call is actually in the file. */}
                    {(s.status === "interrupted" || s.status === "incomplete") && (
                      <p className="text-[11px] text-[#EA580C]">
                        Recording interrupted — {formatDuration(s.captured_seconds)} captured
                      </p>
                    )}
                    {s.status === "failed" && s.error && (
                      <p className="truncate text-[11px] text-[var(--color-danger)]">{s.error}</p>
                    )}
                  </div>

                  <span
                    className="pill shrink-0 text-[11px]"
                    style={{ backgroundColor: `color-mix(in srgb, ${meta.dot} 14%, white)`, color: meta.dot }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                    {meta.label}
                  </span>

                  <span className="w-14 shrink-0 text-right font-mono text-sm text-[var(--color-text-secondary)]">
                    {formatDuration(s.captured_seconds)}
                  </span>

                  <button
                    onClick={() => download(s)}
                    disabled={!canPlay}
                    title={canPlay ? "Download recording" : `Not available — ${meta.label}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-tertiary)] enabled:hover:bg-[var(--color-bg)] enabled:hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Download size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
