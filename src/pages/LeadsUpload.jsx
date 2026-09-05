import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";
import leadService from "../services/leadService";
import campaignService from "../services/campaignService";

// Rough count of non-blank data rows, just for the pre-import preview. The
// authoritative numbers (imported / skipped / duplicates / invalid) come back
// from the server, which does the real RFC-4180 parse and validation.
function previewRowCount(text) {
  const lines = String(text || "").split(/\r?\n/);
  if (lines.length < 2) return 0;
  return lines.slice(1).filter((l) => l.trim().length > 0).length;
}

export default function LeadsUpload() {
  const { notify } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [previewCount, setPreviewCount] = useState(0);
  const [listName, setListName] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    campaignService
      .list()
      .then((res) => setCampaigns(res.data || []))
      .catch(() => {});
  }, []);

  const reset = () => {
    setFile(null);
    setCsvText("");
    setPreviewCount(0);
    setListName("");
    setCampaignId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFiles = (files) => {
    if (!files?.length) return;
    const f = files[0];
    setResult(null);
    setFile(f);
    // Every upload becomes its own Lead List. Default the name to
    // "Lead List – <file>" so it is recognisable on the Lead Lists screen;
    // the admin can still rename it before importing.
    if (!listName) {
      const base = f.name.replace(/\.[^.]+$/, "").trim();
      setListName(/^lead list/i.test(base) ? base : `Lead List – ${base}`);
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setCsvText(text);
      const n = previewRowCount(text);
      setPreviewCount(n);
      notify(`"${f.name}" ready — about ${n} row${n === 1 ? "" : "s"} to import.`, "info", { title: "File Loaded" });
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!listName.trim()) {
      notify("Give this lead list a name.", "warning");
      return;
    }
    if (!csvText.trim()) {
      notify("Load a CSV file first.", "warning");
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const res = await leadService.upload({
        name: listName.trim(),
        campaign_id: campaignId || undefined,
        file_name: file?.name,
        csv: csvText,
      });
      const data = res.data || {};
      setResult({ ...data, campaignName: campaigns.find((c) => c.id === campaignId)?.name || null });
      const s = data.summary || {};
      if (s.imported > 0) {
        notify(`${s.imported} lead${s.imported === 1 ? "" : "s"} imported.`, "success", { title: "Import Complete" });
      } else {
        notify("No leads were imported — see the breakdown below.", "warning", { title: "Nothing Imported" });
      }
    } catch (err) {
      notify(err?.message || "Import failed.", "error", { title: "Lead Import Failed" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <ScreenHeader category="Leads" title="Upload Leads" />
      <div className="p-8 space-y-5">
        {!result && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200 ${
              dragOver ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)]" : "border-[var(--color-border-strong)] bg-white hover:border-[var(--color-accent)]/50"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => handleFiles(e.target.files)} />
            {file ? (
              <>
                <FileText size={32} className="text-[var(--color-accent)]" />
                <p className="text-base font-semibold text-[var(--color-text-primary)]">{file.name}</p>
                <p className="text-sm text-[var(--color-text-tertiary)]">~{previewCount} rows ready to import</p>
              </>
            ) : (
              <>
                <UploadCloud size={32} className="text-[var(--color-text-tertiary)]" />
                <p className="text-base font-semibold text-[var(--color-text-primary)]">Drop your CSV here or click to browse</p>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Header row with a phone column (phone_number / phone / mobile). Optional: first_name, last_name, full_name, email, street_address, city, state, zip_code.
                  Vacation campaigns also read: age, last_traveled, last_travel_destination. Any missing optional column is just left blank — the import still succeeds.
                </p>
              </>
            )}
          </div>
        )}

        {file && !result && (
          <div className="card space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Lead List Name</label>
              <input value={listName} onChange={(e) => setListName(e.target.value)} className="input-field" placeholder="e.g. Fall Roofing — West Region" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Assign to Campaign (optional)</label>
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field">
                <option value="">Unassigned — attach later</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                Imported leads with a campaign selected become dialable in that campaign immediately.
              </p>
            </div>
            <button onClick={handleUpload} disabled={uploading || !csvText.trim()} className="btn-purple w-full py-3">
              {uploading ? "Importing…" : `Import ~${previewCount} Lead${previewCount === 1 ? "" : "s"}`}
            </button>
          </div>
        )}

        {result && <ImportResult result={result} onDone={() => { setResult(null); reset(); }} />}
      </div>
    </div>
  );
}

function ImportResult({ result, onDone }) {
  const s = result.summary || {};
  const failed = result.failed || [];
  const warnings = result.warnings || [];
  const ok = s.imported > 0;

  const stats = [
    { label: "Rows processed", value: s.total_rows ?? 0 },
    { label: "Imported", value: s.imported ?? 0, good: true },
    { label: "Duplicates (in file)", value: s.duplicates_in_file ?? 0 },
    { label: "Duplicates (already in system)", value: s.duplicates_existing ?? 0 },
    { label: "Invalid / failed", value: s.invalid ?? 0, bad: (s.invalid ?? 0) > 0 },
    { label: "On DNC list (imported, won't dial)", value: s.on_dnc ?? 0 },
  ];

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3">
        {ok ? <CheckCircle2 className="text-[var(--color-success)]" size={22} /> : <XCircle className="text-[var(--color-danger)]" size={22} />}
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{ok ? "Import Complete" : "Import Failed — Nothing Imported"}</h2>
          {result.lead_list && (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              List &ldquo;{result.lead_list.name}&rdquo;{result.campaignName ? ` → campaign “${result.campaignName}”` : " (unassigned)"}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {stats.map((b) => (
          <div key={b.label} className="rounded-lg border border-[var(--color-border)] p-3 text-center">
            <p className={`text-xl font-bold ${b.good ? "text-[var(--color-success)]" : b.bad ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}>{b.value}</p>
            <p className="text-[10px] leading-tight text-[var(--color-text-secondary)]">{b.label}</p>
          </div>
        ))}
      </div>

      {failed.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
            <AlertTriangle size={14} className="text-[var(--color-danger)]" /> {failed.length} row{failed.length === 1 ? "" : "s"} could not be imported
          </h3>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--color-bg)]">
                <tr className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-4 py-2 font-medium">Row</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {failed.map((f, i) => (
                  <tr key={i} className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-2 font-mono text-[var(--color-text-tertiary)]">{f.row}</td>
                    <td className="px-4 py-2 text-[var(--color-text-secondary)]">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{warnings.length} warning{warnings.length === 1 ? "" : "s"}</h3>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-secondary)]">
            {warnings.map((w, i) => (
              <li key={i}>
                <span className="font-mono text-[var(--color-text-tertiary)]">Row {w.row}:</span> {w.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onDone} className="btn-outline w-full py-2.5">Import another list</button>
    </div>
  );
}
