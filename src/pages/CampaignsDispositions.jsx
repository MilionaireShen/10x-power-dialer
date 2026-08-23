import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import dispositionService from "../services/dispositionService";

const COLOR_CHOICES = ["#10B981", "#3B82F6", "#EF4444", "#6B7280", "#5B3FE0", "#F59E0B", "#991B1B", "#14B8A6"];

export default function CampaignsDispositions() {
  const { notify } = useToast();
  const [dispositions, setDispositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await dispositionService.list();
      setDispositions(res?.data || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not load dispositions.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!label.trim()) {
      notify("Name the disposition before adding it.", "warning");
      return;
    }
    setBusy("new");
    try {
      await dispositionService.create({ label: label.trim(), color, display_order: dispositions.length + 1 });
      notify(`Disposition "${label.trim()}" added.`, "success");
      setLabel("");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not add the disposition.", "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (d) => {
    setBusy(d.id);
    try {
      await dispositionService.remove(d.id);
      notify(`"${d.label || d.name}" removed.`, "success");
      load();
    } catch (err) {
      // The server refuses to remove one that calls are already filed under,
      // and explains why — passed straight through.
      notify(err?.response?.data?.message || "Could not remove the disposition.", "error");
    } finally {
      setBusy(null);
    }
  };

  const recolor = async (d, next) => {
    setBusy(d.id);
    try {
      await dispositionService.update(d.id, { color: next });
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Could not update the colour.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <ScreenHeader category="Campaigns" title="Dispositions" />
      <div className="space-y-6 p-8">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Add Disposition</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                placeholder="e.g. Left Voicemail"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Color</label>
              <div className="flex gap-1.5">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Use ${c}`}
                    className={`h-8 w-8 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-offset-2 ring-[var(--color-accent)]" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <button onClick={add} disabled={busy === "new" || !label.trim()} className="btn-purple disabled:opacity-40">
              <Plus size={15} /> Add
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">
            Dispositions appear on every agent's call screen and are what the reports group by.
          </p>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Configured Dispositions</h2>
          {loading ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
          ) : error ? (
            <EmptyState icon={Tag} title="Could not load dispositions" description={error} />
          ) : dispositions.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No dispositions configured"
              description="Add one above — agents cannot close a call without one."
            />
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {dispositions.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color || "#6B7280" }} />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{d.label || d.name}</span>
                    {d.is_default && (
                      <span className="pill bg-[var(--color-bg)] text-[10px] text-[var(--color-text-tertiary)]">Built in</span>
                    )}
                    {d.is_dnc_trigger && (
                      <span className="pill text-[10px]" style={{ backgroundColor: "var(--color-danger-tint)", color: "var(--color-danger)" }}>
                        Adds to DNC
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {COLOR_CHOICES.slice(0, 4).map((c) => (
                        <button
                          key={c}
                          onClick={() => recolor(d, c)}
                          disabled={busy === d.id}
                          aria-label={`Recolour to ${c}`}
                          className="h-4 w-4 rounded-full opacity-60 transition-opacity hover:opacity-100 disabled:opacity-30"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => remove(d)}
                      disabled={busy === d.id}
                      className="text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-danger)] disabled:opacity-40"
                      aria-label="Delete disposition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
