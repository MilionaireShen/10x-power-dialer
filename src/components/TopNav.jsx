import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { ADMIN_NAV } from "../lib/adminNav";
import { useAuth } from "../lib/AuthContext";
import { hasAnyPermission } from "../lib/permissions";

export default function TopNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openKey, setOpenKey] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => setOpenKey(null), [location.pathname]);

  const visibleCategories = ADMIN_NAV.filter((cat) => {
    if (cat.adminOnly && user.role === "manager") return false;
    if (cat.anyPermission && user.role === "manager" && !hasAnyPermission(user, cat.anyPermission)) return false;
    return true;
  });

  return (
    <div ref={rootRef} className="flex items-center gap-1 border-b border-[var(--color-border)] bg-white px-4">
      {visibleCategories.map((cat) => {
        const items = cat.items.filter((item) => !item.superAdminOnly || user.role === "super_admin");
        if (items.length === 0) return null;
        const isActive = location.pathname.startsWith(`/admin/${cat.key === "callcenter" ? "call-center" : cat.key === "phonesystem" ? "phone-system" : cat.key}`);
        const Icon = cat.icon;
        return (
          <div key={cat.key} className="relative">
            <button
              onClick={() => setOpenKey(openKey === cat.key ? null : cat.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors duration-150 ${
                isActive || openKey === cat.key
                  ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon size={15} />
              {cat.label}
              <ChevronDown size={13} className={`transition-transform duration-150 ${openKey === cat.key ? "rotate-180" : ""}`} />
            </button>

            {openKey === cat.key && (
              <div className="absolute left-0 top-full z-30 w-64 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white py-1.5 shadow-xl">
                {items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      setOpenKey(null);
                      navigate(item.path);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent-tint)] hover:text-[var(--color-accent)]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
