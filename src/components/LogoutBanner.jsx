export default function LogoutBanner({ banner }) {
  if (!banner) return null;
  const Icon = banner.icon;
  return (
    <div
      className="mb-5 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium"
      style={{
        borderColor: banner.tone === "danger" ? "var(--color-danger)" : "var(--color-warning)",
        backgroundColor: banner.tone === "danger" ? "var(--color-danger-tint)" : "var(--color-warning-tint)",
        color: banner.tone === "danger" ? "var(--color-danger)" : "var(--color-warning)",
      }}
    >
      <Icon size={16} className="shrink-0" />
      {banner.message}
    </div>
  );
}
