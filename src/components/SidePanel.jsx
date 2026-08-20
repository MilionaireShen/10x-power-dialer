import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Every modal in the app slides in from the right as a side panel — never a
// centered popup — per the design spec.
export default function SidePanel({ open, onClose, title, subtitle, children, widthClass = "max-w-md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="side-panel-overlay animate-[fadeIn_0.3s_ease]" onClick={onClose} />
      <div className={`side-panel ${widthClass} animate-[slideIn_0.3s_ease]`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--color-border)] bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>,
    document.body
  );
}
