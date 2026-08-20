import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-white px-6 py-16 text-center">
      <Icon size={32} className="text-[var(--color-text-tertiary)]" />
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {description && <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{description}</p>}
      {actionLabel && (
        <button onClick={onAction} className="btn-purple mt-2">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
