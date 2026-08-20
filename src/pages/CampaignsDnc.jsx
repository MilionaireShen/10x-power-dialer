import { useEffect, useRef, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";
import dncService from "../services/dncService";

export default function CampaignsDnc() {
  const { notify } = useToast();
  const [entries, setEntries] = useState([]);
  const [autoScrub, setAutoScrub] = useState(true);
  const [dncNumber, setDncNumber] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const refresh = () => {
    dncService
      .list()
      .then((res) => {
        setEntries(res.data || []);
        if (typeof res.meta?.auto_scrub === "boolean") setAutoScrub(res.meta.auto_scrub);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAdd = async () => {
    if (!dncNumber.trim()) {
      notify("Enter a phone number first.", "warning");
      return;
    }
    setAdding(true);
    try {
      await dncService.add(dncNumber.trim(), "Manually added");
      notify(`${dncNumber} added to DNC list.`, "success");
      setDncNumber("");
      refresh();
    } catch (err) {
      notify(err?.message || "Could not add that number.", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id, phoneNumber) => {
    try {
      await dncService.remove(id);
      notify(`${phoneNumber} removed from DNC list.`, "success");
      refresh();
    } catch (err) {
      notify(err?.message || "Could not remove that number.", "error");
    }
  };

  const handleToggleAutoScrub = async () => {
    const next = !autoScrub;
    setAutoScrub(next);
    try {
      await dncService.updateSettings(next);
    } catch {
      setAutoScrub(!next);
      notify("Could not save that setting.", "error");
    }
  };

  const handleUploadFile = (files) => {
    if (!files?.length) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const numbers = String(reader.result || "")
        .split(/\r?\n/)
        .map((line) => line.split(",")[0].trim())
        .filter((v) => v && v.toLowerCase() !== "phone_number" && v.toLowerCase() !== "phone");
      if (numbers.length === 0) {
        notify("That file had no phone numbers to import.", "warning");
        return;
      }
      setUploading(true);
      try {
        const res = await dncService.bulkAdd(numbers);
        notify(`Imported ${res.data.imported} number${res.data.imported === 1 ? "" : "s"} to the DNC list.`, "success");
        refresh();
      } catch (err) {
        notify(err?.message || "Upload failed.", "error");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <ScreenHeader category="Campaigns" title="DNC List" />
      <div className="p-8 space-y-4">
        <div className="card">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{loaded ? entries.length.toLocaleString() : "—"}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">numbers on the DNC list</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input value={dncNumber} onChange={(e) => setDncNumber(e.target.value)} placeholder="(555) 555-0100" className="input-field w-48" />
              <button onClick={handleAdd} disabled={adding} className="btn-purple">
                {adding ? "Adding…" : "Add Number"}
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" hidden onChange={(e) => handleUploadFile(e.target.files)} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-gray">
                {uploading ? "Uploading…" : "Upload DNC List"}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Auto-Scrub New Uploads</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Every uploaded list is automatically scrubbed against the DNC list</p>
            </div>
            <button
              onClick={handleToggleAutoScrub}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${autoScrub ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
            >
              <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ${autoScrub ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        {loaded && entries.length === 0 ? (
          <div className="card text-sm text-[var(--color-text-tertiary)]">No numbers on the DNC list yet.</div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-5 py-3 font-medium">Phone Number</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{e.phone_number}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{e.reason || "—"}</td>
                    <td className="px-5 py-3.5 capitalize text-[var(--color-text-secondary)]">{e.source || "manual"}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleRemove(e.id, e.phone_number)} className="font-medium text-[var(--color-danger)] hover:underline">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
