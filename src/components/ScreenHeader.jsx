import { ChevronRight } from "lucide-react";

// Every dedicated admin screen uses this: title + actions row, with a
// Category > Screen breadcrumb beneath it, per the restructured layout rules.
export default function ScreenHeader({ category, title, actions }) {
  return (
    <div className="border-b border-[var(--color-border)] bg-white px-8 py-6">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
        <span>{category}</span>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text-secondary)]">{title}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
