export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] bg-white px-8 py-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
