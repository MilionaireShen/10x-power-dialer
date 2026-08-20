import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useToast } from "../lib/ToastContext";
import leadService from "../services/leadService";
import campaignService from "../services/campaignService";

// Recognized CSV header variants → the field names POST /leads/upload
// expects. A simple split(",") parser — good enough for a plain export
// without embedded commas/quotes, which is what this screen's copy
// ("Name, Phone Number, Location") asks users to provide.
const HEADER_MAP = {
  first_name: "first_name",
  firstname: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  phone: "phone_number",
  phone_number: "phone_number",
  email: "email",
  street: "street_address",
  street_address: "street_address",
  address: "street_address",
  city: "city",
  state: "state",
  zip: "zip_code",
  zip_code: "zip_code",
  zipcode: "zip_code",
};

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { leads: [], skippedNoHeader: true };

  const headers = lines[0].split(",").map((h) => HEADER_MAP[h.trim().toLowerCase()] || null);
  const nameIdx = lines[0].split(",").findIndex((h) => h.trim().toLowerCase() === "name" || h.trim().toLowerCase() === "full_name");

  const leads = lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const lead = {};
    headers.forEach((field, i) => {
      if (field && cells[i]) lead[field] = cells[i];
    });
    if (nameIdx >= 0 && cells[nameIdx] && !lead.first_name) {
      const [first, ...rest] = cells[nameIdx].split(" ");
      lead.first_name = first;
      if (rest.length) lead.last_name = rest.join(" ");
    }
    return lead;
  });

  return { leads, skippedNoHeader: false };
}

export default function LeadsUpload() {
  const { notify } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [parsedLeads, setParsedLeads] = useState([]);
  const [listName, setListName] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    campaignService
      .list()
      .then((res) => setCampaigns(res.data || []))
      .catch(() => {});
  }, []);

  const handleFiles = (files) => {
    if (!files?.length) return;
    const f = files[0];
    setFile(f);
    if (!listName) setListName(f.name.replace(/\.csv$/i, ""));
    const reader = new FileReader();
    reader.onload = () => {
      const { leads, skippedNoHeader } = parseCsv(String(reader.result || ""));
      if (skippedNoHeader) {
        notify("That file needs a header row plus at least one lead.", "warning");
        setParsedLeads([]);
        return;
      }
      const withPhone = leads.filter((l) => l.phone_number);
      setParsedLeads(withPhone);
      notify(`Parsed ${withPhone.length} lead${withPhone.length === 1 ? "" : "s"} with a phone number from "${f.name}".`, "info", { title: "File Parsed" });
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!listName.trim()) {
      notify("Give this lead list a name.", "warning");
      return;
    }
    if (parsedLeads.length === 0) {
      notify("No leads with a phone number to import.", "warning");
      return;
    }
    setUploading(true);
    try {
      const res = await leadService.upload({
        name: listName,
        campaign_id: campaignId || undefined,
        file_name: file?.name,
        leads: parsedLeads,
      });
      notify(`Imported ${res.data.imported} lead${res.data.imported === 1 ? "" : "s"}${res.data.skipped ? ` (${res.data.skipped} skipped — no phone number)` : ""}.`, "success", {
        title: "Upload Complete",
      });
      setFile(null);
      setParsedLeads([]);
      setListName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      notify(err?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <ScreenHeader category="Leads" title="Upload Leads" />
      <div className="p-8 space-y-5">
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
          <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={(e) => handleFiles(e.target.files)} />
          {file ? (
            <>
              <FileText size={32} className="text-[var(--color-accent)]" />
              <p className="text-base font-semibold text-[var(--color-text-primary)]">{file.name}</p>
              <p className="text-sm text-[var(--color-text-tertiary)]">{parsedLeads.length} leads with a phone number ready to import</p>
            </>
          ) : (
            <>
              <UploadCloud size={32} className="text-[var(--color-text-tertiary)]" />
              <p className="text-base font-semibold text-[var(--color-text-primary)]">Drop your CSV here or click to browse</p>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                Header row with: first_name, last_name, phone_number, email, street_address, city, state, zip_code
              </p>
            </>
          )}
        </div>

        {file && (
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
            </div>
            <button onClick={handleUpload} disabled={uploading || parsedLeads.length === 0} className="btn-purple w-full py-3">
              {uploading ? "Uploading…" : `Import ${parsedLeads.length} Lead${parsedLeads.length === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
