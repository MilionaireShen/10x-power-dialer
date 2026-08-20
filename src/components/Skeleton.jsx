export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--color-border)] ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <SkeletonBlock className="h-4 w-1/3" />
      <SkeletonBlock className="h-8 w-1/2" />
      <SkeletonBlock className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <SkeletonBlock className="h-9 w-9 rounded-full" />
      <SkeletonBlock className="h-3 flex-1" />
      <SkeletonBlock className="h-3 w-20" />
      <SkeletonBlock className="h-3 w-16" />
    </div>
  );
}
