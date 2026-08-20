import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const VARIANT_STYLES = {
  success: { accent: "border-l-[var(--color-success)]", iconColor: "text-[var(--color-success)]", Icon: CheckCircle2 },
  error: { accent: "border-l-[var(--color-danger)]", iconColor: "text-[var(--color-danger)]", Icon: XCircle },
  warning: { accent: "border-l-[var(--color-warning)]", iconColor: "text-[var(--color-warning)]", Icon: AlertTriangle },
  info: { accent: "border-l-[var(--color-info)]", iconColor: "text-[var(--color-info)]", Icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message, variant = "info", opts = {}) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant, title: opts.title }]);
      setTimeout(() => dismiss(id), opts.duration ?? 4500);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const s = VARIANT_STYLES[t.variant] ?? VARIANT_STYLES.info;
          const Icon = s.Icon;
          return (
            <div
              key={t.id}
              className={`animate-toast-in flex items-start gap-3 rounded-lg border border-[var(--color-border)] border-l-[3px] ${s.accent} bg-white px-4 py-3 shadow-lg`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${s.iconColor}`} />
              <div className="flex-1 text-sm">
                {t.title && <p className="font-semibold text-[var(--color-text-primary)]">{t.title}</p>}
                <p className="text-[var(--color-text-secondary)]">{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
