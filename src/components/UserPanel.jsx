import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import SidePanel from "./SidePanel";
import { ROLE_CARDS } from "../data/catalogues";
import { useToast } from "../lib/ToastContext";
import userService from "../services/userService";

const emptyForm = { firstName: "", lastName: "", email: "", extension: "", role: "agent", campaigns: [] };

export default function UserPanel({ open, onClose, editingUser, campaigns, onSaved }) {
  const { notify } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const isEdit = Boolean(editingUser);

  useEffect(() => {
    if (!open) return;
    setTempPassword(null);
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
    }
  }, [open, editingUser]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleCampaign = (id) => {
    setForm((f) => ({
      ...f,
      campaigns: f.campaigns.includes(id) ? f.campaigns.filter((c) => c !== id) : [...f.campaigns, id],
    }));
  };

  const assignAllCampaigns = (checked) => {
    setForm((f) => ({ ...f, campaigns: checked ? campaigns.map((c) => c.id) : [] }));
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      notify("First name, last name, and email are required.", "warning");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await userService.update(editingUser.id, {
          first_name: form.firstName,
          last_name: form.lastName,
          role: form.role,
          extension: form.extension || undefined,
          campaign_ids: form.role === "admin" || form.role === "super_admin" ? [] : form.campaigns,
        });
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
          campaign_ids: form.role === "agent" ? form.campaigns : [],
        });
        setTempPassword(res.data.temporary_password);
        onSaved?.();
      }
    } catch (err) {
      notify(err?.message || "Could not save this user.", "error");
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
      notify(err?.message || "Could not update this user's status.", "error");
    } finally {
      setSaving(false);
    }
  };

  const fullName = editingUser ? `${editingUser.first_name} ${editingUser.last_name}` : "";

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
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                notify("Password copied to clipboard.", "success");
              }}
              className="btn-gray shrink-0 px-3"
            >
              <Copy size={14} />
            </button>
          </div>
          <button onClick={onClose} className="btn-purple w-full py-3">
            Done
          </button>
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
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            className="input-field"
            placeholder="name@company.com"
            disabled={isEdit}
          />
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
            {ROLE_CARDS.map((r) => {
              const active = form.role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setField("role", r.key)}
                  className="flex items-start justify-between gap-3 rounded-lg border-2 p-3 text-left transition-all duration-150"
                  style={{
                    borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                    backgroundColor: active ? "var(--color-accent-tint)" : "white",
                  }}
                >
                  <span>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{r.label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{r.description}</p>
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

        {form.role === "agent" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Campaign Assignment</label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={campaigns.length > 0 && form.campaigns.length === campaigns.length}
                  onChange={(e) => assignAllCampaigns(e.target.checked)}
                  className="accent-[var(--color-accent)]"
                />
                Assign to All Campaigns
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
            <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">Agents only see campaigns assigned here.</p>
          </div>
        )}

        {isEdit && (
          <button
            onClick={toggleStatus}
            disabled={saving}
            className={editingUser.status === "active" ? "btn-danger w-full" : "btn-success w-full"}
          >
            {editingUser.status === "active" ? "Deactivate Account" : "Reactivate Account"}
          </button>
        )}

        <button onClick={save} disabled={saving} className="btn-purple w-full py-3">
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
        </button>
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
