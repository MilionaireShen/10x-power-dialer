import { useEffect, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import SidePanel from "./SidePanel";
import { useToast } from "../lib/ToastContext";
import userService from "../services/userService";

// Permanent, irreversible account deletion. Deliberately separate from the
// edit panel and from "Deactivate" so it can't be hit by accident — the
// admin has to type DELETE.
export default function DeleteUserDialog({ user, onClose, onDeleted }) {
  const { notify } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText("");
  }, [user]);

  const open = Boolean(user);
  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "";
  const armed = text.trim().toUpperCase() === "DELETE";

  const confirm = async () => {
    setBusy(true);
    try {
      await userService.remove(user.id, "DELETE");
      notify(`${fullName} permanently deleted.`, "success");
      onDeleted?.();
      onClose();
    } catch (err) {
      notify(err?.response?.data?.message || err?.message || "Could not delete this user.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SidePanel open={open} onClose={onClose} title="Delete User Permanently" subtitle={user?.email} widthClass="max-w-md">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-tint)]/40 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <div className="text-sm text-[var(--color-text-primary)]">
            <p className="font-semibold">This cannot be undone.</p>
            <p className="mt-1 text-[var(--color-text-secondary)]">
              {fullName}&rsquo;s account and login are removed for good. Their call history, recordings, sales and other
              records are kept for reporting but will no longer show their name.
            </p>
            <p className="mt-1 text-[var(--color-text-secondary)]">
              If you only need to block their access, close this and use <strong>Deactivate</strong> instead — that keeps
              the account and can be reversed.
            </p>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            Type <span className="font-mono font-semibold text-[var(--color-text-primary)]">DELETE</span> to confirm
          </span>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && armed && !busy && confirm()}
            placeholder="DELETE"
            className="input-field"
          />
        </label>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-gray flex-1">
            Cancel
          </button>
          <button onClick={confirm} disabled={!armed || busy} className="btn-danger flex-1 disabled:opacity-40">
            <Trash2 size={14} /> {busy ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </div>
    </SidePanel>
  );
}
