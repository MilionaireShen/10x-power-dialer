import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck, Save, Info } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import adminService from "../services/adminService";
import userService from "../services/userService";

// Permissions are per user, not per role: two managers with the same role
// legitimately have different access. The role picker below narrows who is
// listed; the checklist edits whoever is selected.
const EDITABLE_ROLES = ["manager", "admin"];

function personName(u) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
}

export default function UsersPermissions() {
  const { notify } = useToast();
  const [sections, setSections] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [permissions, setPermissions] = useState({});
  const [baseline, setBaseline] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  // The catalogue comes from the permission table's own columns, so the
  // checklist cannot offer a permission the server does not understand.
  useEffect(() => {
    Promise.all([adminService.permissionCatalogue(), userService.list()])
      .then(([cat, list]) => {
        setSections(cat?.data?.sections || []);
        const editable = (list?.data || []).filter((u) => EDITABLE_ROLES.includes(u.role));
        setUsers(editable);
        if (editable.length) {
          const wanted = searchParams.get("user");
          const match = wanted && editable.find((u) => u.id === wanted);
          setSelectedId(match ? match.id : editable[0].id);
        }
      })
      .catch((err) => {
        const message = err?.response?.data?.message || "Could not load the permission catalogue.";
        setError(message);
        notify(message, "error");
      })
      .finally(() => setLoading(false));
  }, [notify]);

  const loadFor = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await adminService.getPermissions(userId);
      setPermissions(res?.data?.permissions || {});
      setBaseline(res?.data?.permissions || {});
    } catch (err) {
      notify(err?.response?.data?.message || "Could not load that user's permissions.", "error");
      setPermissions({});
      setBaseline({});
    }
  }, [notify]);

  useEffect(() => { loadFor(selectedId); }, [selectedId, loadFor]);

  const toggle = (key) => setPermissions((p) => ({ ...p, [key]: !p[key] }));

  const dirty = Object.keys({ ...permissions, ...baseline })
    .some((k) => Boolean(permissions[k]) !== Boolean(baseline[k]));

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminService.setPermissions(selectedId, permissions);
      setBaseline(res?.data?.permissions || permissions);
      // Permissions travel in the JWT, so the change lands on the user's next
      // sign-in rather than immediately. Said plainly rather than left to be
      // discovered when it appears not to have worked.
      notify(
        `Permissions saved. They take effect ${res?.data?.takes_effect || "on the user's next login"}.`,
        "success",
      );
    } catch (err) {
      notify(err?.response?.data?.message || "Could not save permissions.", "error");
    } finally {
      setSaving(false);
    }
  };

  const selected = users.find((u) => u.id === selectedId);

  return (
    <div>
      <ScreenHeader
        category="Users"
        title="Role Permissions"
        actions={
          <button onClick={save} disabled={!selectedId || !dirty || saving} className="btn-purple disabled:opacity-40">
            <Save size={15} /> {saving ? "Saving…" : "Save Permissions"}
          </button>
        }
      />
      <div className="space-y-6 p-8">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : error ? (
          <EmptyState icon={ShieldCheck} title="Could not load permissions" description={error} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No managers or admins to configure"
            description="Permissions apply to manager and admin accounts. Create one under All Users first."
          />
        ) : (
          <>
            <div className="card space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Configuring</span>
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="input-field max-w-md">
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{personName(u)} — {u.role}</option>
                  ))}
                </select>
              </label>
              <p className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                <Info size={13} className="mt-px shrink-0" />
                {selected?.role === "admin"
                  ? "Admins already have full administrative access; this checklist has no effect on them."
                  : "The server checks these on every request, so an unchecked permission cannot be reached by calling the API directly."}
              </p>
            </div>

            {sections.map((section) => (
              <div key={section.key} className="card">
                <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{section.label}</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {section.permissions.map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(permissions[p.key])}
                        onChange={() => toggle(p.key)}
                        className="accent-[var(--color-accent)]"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
