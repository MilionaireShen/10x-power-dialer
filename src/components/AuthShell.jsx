import { PhoneCall } from "lucide-react";

// Shared split-panel shell used by all three role-specific login pages —
// keeps the exact same branding/design system across /agent/login,
// /admin/login, and /superadmin/login.
export default function AuthShell({ portalLabel, children }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden w-[42%] flex-col justify-between bg-[var(--color-accent)] px-12 py-12 lg:flex">
        <div className="flex items-center gap-2.5 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-sm font-bold">10X</div>
          <span className="text-[15px] font-semibold">Power Dialer</span>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-white/60">{portalLabel}</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-white">10X Power Dialer</h1>
          <p className="mt-3 max-w-sm text-white/70">The last dialer you will ever need — built for agents, admins, and multi-location teams.</p>
        </div>

        <p className="text-xs text-white/40">© 2026 10X Power Dialer. All rights reserved.</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-accent)] text-white">
              <PhoneCall size={18} />
            </div>
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">10X Power Dialer</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthField({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">{label}</label>
      {children}
    </div>
  );
}

export function AuthDivider({ label }) {
  return (
    <div className="mb-1 flex items-center gap-3">
      <div className="h-px flex-1 bg-[var(--color-border)]" />
      <p className="text-sm italic text-[var(--color-text-tertiary)]">{label}</p>
      <div className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}
