import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Trash2, ShieldCheck } from "lucide-react";
import SidePanel from "./SidePanel";
import { ROLE_CARDS } from "../data/catalogues";
import { useToast } from "../lib/ToastContext";
import { useAuth } from "../lib/AuthContext";
import { hasPermission } from "../lib/permissions";
import userService from "../services/userService";
import adminService from "../services/adminService";

const emptyForm = { firstName: "", lastName: "", email: "", extension: "", role: "agent", campaigns: [] };
const SCOPED_ROLES = ["agent", "manager"]; // roles that get a campaign/team assignment

export default function UserPanel({ open, onClose, editingUser, campaigns, onSaved }) {
  const { notify } = useToast();
  const { user: me } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const isEdit = Boolean(editingUser);

  // --- manager permissions (inline) ---
  const [permSections, setPermSections] = useState([]);
  const [perms, setPerms] = useState({});
  const [permBaseline, setPermBaseline] = useState({});
  const [deleteText, setDeleteText] = useState("");

  const canManagePermissions = hasPermission(me, "can_manage_permissions") || me?.role === "admin" || me?.role === "super_admin";
  const canDeleteUsers = hasPermission(me, "can_delete_users") || me?.role === "admin" || me?.role === "super_admin";
  const canDeactivate = hasPermission(me, "can_deactivate_users") || me?.role === "admin" || me?.role === "super_admin";
  const canEditUsers = hasPermission(me, "can_edit_users") || hasPermission(me, "can_create_users") || me?.role === "admin" || me?.role === "super_admin";

  useEffect(() => {
    if (!open) return;
    setTempPassword(null);
    setDeleteText("");
    if (editingUser) {
      setForm({
        firstName: editingUser.first_name,
        lastName: editingUser.last_name,
        email: editingUser.email,
        extension: editingUser.extension || "",
        role: editingUser.role,
        campaigns: editingUser.campaign_ids ?? [],
      });
    } else {
      setForm(emptyForm);
      setPerms({});
      setPermBaseline({});
    }
  }, [open, editingUser]);

  // Load the permission catalogue once, and the editing user's current
  // permissions when a manager is being edited.
  const loadPerms = useCallback(async () => {
    if (!canManagePermissions) return;
    try {
      if (permSections.length === 0) {
        const cat = await adminService.permissionCatalogue();
        setPermSections(cat?.data?.sections || []);
      }
      if (editingUser && (editingUser.role === "manager" || form.role === "manager")) {
        const res = await adminService.getPermissions(editingUser.id);
        setPerms(res?.data?.permissions || {});
        setPermBaseline(res?.data?.permissions || {});
      }
    } catch {
      /* the checklist just stays empty */
    }
  }, [canManagePermissions, editingUser, form.role, permSections.length]);

  useEffect(() => {
    if (open && form.role === "manager") loadPerms();
  }, [open, form.role, loadPerms]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const togglePerm = (k) => setPerms((p) => ({ ...p, [k]: !p[k] }));
  const bulkPerms = (on) => {
    const all = {};
    for (const s of permSections) for (const p of s.permissions) all[p.key] = on;
    setPerms(all);
  };
  const permsDirty = Object.keys({ ...perms, ...permBaseline }).some((k) => Boolean(perms[k]) !== Boolean(permBaseline[k]));

  const toggleCampaign = (id) => {
    setForm((f) => ({
      ...f,
      campaigns: f.campaigns.includes(id) ? f.campaigns.filter((c) => c !== id) : [...f.campaigns, id],
    }));
  };
  const assignAllCampaigns = (checked) => setForm((f) => ({ ...f, campaigns: checked ? campaigns.map((c) => c.id) : [] }));

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      notify("First name, last name, and email are required.", "warning");
      return;
    }
    setSaving(true);
    try {
      const scoped = SCOPED_ROLES.includes(form.role);
      if (isEdit) {
        await userService.update(editingUser.id, {
          first_name: form.firstName,
          last_name: form.lastName,
          role: form.role,
          extension: form.extension || undefined,
          campaign_ids: scoped ? form.campaigns : [],
        });
        if (form.role === "manager" && canManagePermissions && permsDirty) {
          await adminService.setPermissions(editingUser.id, perms);
        }
        notify(`${form.firstName} ${form.lastName} updated.`, "success");
        onSaved?.();
        onClose();
      } else {
        const res = await userService.create({
          email: form.email,
          first_name: form.firstName,
          last_name: form.lastName,
          role: form.role,
          extension: form.extension || undefined,
          campaign_ids: scoped ? form.campaigns : [],
        });
        const newId = res?.data?.id;
        if (form.role === "manager" && canManagePermissions && newId && Object.values(perms).some(Boolean)) {
          await adminService.setPermissions(newId, perms).catch(() => {});
        }
        setTempPassword(res.data.temporary_password);
        onSaved?.();
      }
    } catch (err) {
      notify(err?.response?.data?.message || err?.message || "Could not save this user.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    setSaving(true);
    try {
      if (editingUser.status === "active") {
        await userService.deactivate(editingUser.id);
        notify(`${form.firstName} ${form.lastName} deactivated.`, "warning");
      } else {
        await userService.update(editingUser.id, { status: "active" });
        notify(`${form.firstName} ${form.lastName} reactivated.`, "success");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      notify(err?.response?.data?.message || err?.message || "Could not update this user's status.", "error");
    } finally {
      setSaving(false);
    }
  };

  const permanentlyDelete = async () => {
    setSaving(true);
    try {
      await userService.remove(editingUser.id, deleteText.trim().toUpperCase());
      notify(`${form.firstName} ${form.lastName} permanently deleted.`, "success");
      onSaved?.();
      onClose();
    } catch (err) {
      notify(err?.response?.data?.message || err?.message || "Could not delete this user.", "error");
    } finally {
      setSaving(false);
    }
  };

  const fullName = editingUser ? `${editingUser.first_name} ${editingUser.last_name}` : "";
  const isSelf = editingUser && me && editingUser.id === me.id;
  const roleCards = ROLE_CARDS.filter((r) => r.key !== "super_admin" || me?.role === "super_admin");

  if (tempPassword) {
    return (
      <SidePanel open={open} onClose={onClose} title="User Created" subtitle={form.email} widthClass="max-w-lg">
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-tint)] p-4 text-sm text-[var(--color-text-primary)]">
            Share this temporary password with {form.firstName} securely — it will not be shown again.
          </div>
          <div className="flex items-center gap-2">
            <input readOnly value={tempPassword} className="input-field font-mono" />
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(tempPassword); notify("Password copied to clipboard.", "success"); }}
              className="btn-gray shrink-0 px-3"
            >
              <Copy size={14} />
            </button>
          </div>
          <button onClick={onClose} className="btn-purple w-full py-3">Done</button>
        </div>
      </SidePanel>
    );
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${fullName}` : "Add New User"}
      subtitle={isEdit ? editingUser.email : "Create a login and assign their role"}
      widthClass="max-w-lg"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name">
            <input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} className="input-field" />
          </Field>
          <Field label="Last Name">
            <input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} className="input-field" />
          </Field>
        </div>

        <Field label="Email Address">
          <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="input-field" placeholder="name@company.com" disabled={isEdit} />
        </Field>

        <Field label="Extension (optional)">
          <input value={form.extension} onChange={(e) => setField("extension", e.target.value)} className="input-field" placeholder="e.g. 204" />
        </Field>

        {!isEdit && (
          <p className="text-xs text-[var(--color-text-tertiary)]">
            A temporary password is generated automatically and shown once after the account is created.
          </p>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">Role</label>
          <div className="grid grid-cols-1 gap-2.5">
            {roleCards.map((r) => {
              const active = form.role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setField("role", r.key)}
                  className="flex items-start justify-between gap-3 rounded-lg border-2 p-3 text-left transition-all duration-150"
                  style={{ borderColor: active ? "var(--color-accent)" : "var(--color-border)", backgroundColor: active ? "var(--color-accent-tint)" : "white" }}
                >
                  <span>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{r.label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {r.key === "manager" ? "A role only — configure exactly what this manager can see and do below." : r.description}
                    </p>
                  </span>
                  {active && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {SCOPED_ROLES.includes(form.role) && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                {form.role === "manager" ? "Team / Campaign Scope" : "Campaign Assignment"}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={campaigns.length > 0 && form.campaigns.length === campaigns.length}
                  onChange={(e) => assignAllCampaigns(e.target.checked)}
                  className="accent-[var(--color-accent)]"
                />
                All Campaigns
              </label>
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-border)] p-2">
              {campaigns.length === 0 && <p className="px-2 py-1.5 text-xs text-[var(--color-text-tertiary)]">No campaigns yet.</p>}
              {campaigns.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]">
                  <input type="checkbox" checked={form.campaigns.includes(c.id)} onChange={() => toggleCampaign(c.id)} className="accent-[var(--color-accent)]" />
                  {c.name}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
              {form.role === "manager"
                ? "This manager's team reports, monitoring and user list are limited to agents on these campaigns."
                : "Agents only see campaigns assigned here."}
            </p>
          </div>
        )}

        {form.role === "manager" && canManagePermissions && (
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
                <ShieldCheck size={14} /> Manager Permissions
              </span>
              <span className="flex gap-2 text-xs">
                <button type="button" onClick={() => bulkPerms(true)} className="text-[var(--color-accent)] hover:underline">Select All</button>
                <button type="button" onClick={() => bulkPerms(false)} className="text-[var(--color-text-tertiary)] hover:underline">Clear All</button>
              </span>
            </div>
            {permSections.length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)]">Loading the permission list…</p>
            ) : (
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {permSections.map((s) => (
                  <div key={s.key}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">{s.label}</p>
                    <div className="grid grid-cols-1 gap-1">
                      {s.permissions.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]">
                          <input type="checkbox" checked={Boolean(perms[p.key])} onChange={() => togglePerm(p.key)} className="accent-[var(--color-accent)]" />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
              Enforced on every API request — an unchecked box cannot be reached by URL or direct call. Takes effect on this manager&rsquo;s next login.
            </p>
          </div>
        )}

        {isEdit && canDeactivate && !isSelf && (
          <button
            onClick={toggleStatus}
            disabled={saving}
            className={editingUser.status === "active" ? "btn-danger w-full" : "btn-success w-full"}
          >
            {editingUser.status === "active" ? "Deactivate Account" : "Reactivate Account"}
          </button>
        )}

        {canEditUsers && (
          <button onClick={save} disabled={saving} className="btn-purple w-full py-3">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
        )}

        {isEdit && canDeleteUsers && !isSelf && (
          <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-tint)]/40 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-danger)]">
              <Trash2 size={14} /> Delete Permanently
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Removes {fullName}&rsquo;s account for good. Call history, recordings and other business records are kept but
              stop showing this person. <span className="font-medium">This cannot be undone.</span> Deactivate instead if
              you only need to block their access.
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="input-field mt-2 py-1.5 text-sm"
            />
            <button
              onClick={permanentlyDelete}
              disabled={saving || deleteText.trim().toUpperCase() !== "DELETE"}
              className="btn-danger mt-2 w-full disabled:opacity-40"
            >
              Permanently Delete This User
            </button>
          </div>
        )}
      </div>
    </SidePanel>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}
