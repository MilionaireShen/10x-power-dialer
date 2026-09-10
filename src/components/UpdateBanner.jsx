import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// An SPA tab left open keeps running whatever bundle it first loaded, so a
// user can sit on a weeks-old build without knowing. This polls the served
// index.html for the current asset hash and, when it changes, offers a
// one-click refresh instead of leaving them to discover it.
const CURRENT = (() => {
  if (typeof document === "undefined") return null;
  const s = document.querySelector('script[src*="/assets/index-"]');
  const m = s && s.getAttribute("src").match(/index-[A-Za-z0-9_-]+\.js/);
  return m ? m[0] : null;
})();

async function fetchLiveHash() {
  try {
    const res = await fetch(`/?_v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/index-[A-Za-z0-9_-]+\.js/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

export default function UpdateBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV || !CURRENT) return undefined;

    let stopped = false;
    const check = async () => {
      if (stopped || document.hidden) return;
      const live = await fetchLiveHash();
      if (!stopped && live && live !== CURRENT) setStale(true);
    };

    const interval = setInterval(check, 90_000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    check();

    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[100] flex items-center gap-3 rounded-lg border border-[var(--color-border)] border-l-[3px] border-l-[var(--color-accent)] bg-white px-4 py-3 shadow-lg">
      <RefreshCw size={16} className="shrink-0 text-[var(--color-accent)]" />
      <span className="text-sm text-[var(--color-text-secondary)]">A newer version of the dashboard is available.</span>
      <button onClick={() => window.location.reload()} className="btn-purple shrink-0 px-3 py-1.5 text-xs">
        Refresh
      </button>
    </div>
  );
}
