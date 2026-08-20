import { useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "../lib/ToastContext";
import reportService from "../services/reportService";

// Backend report endpoints only support `?format=csv` (see sendReport in
// utils/reportResponse.js) — there's no PDF renderer, so this only offers
// a real CSV export rather than a second button that can't do anything.
export default function ExportActions({ reportPath, params, filename }) {
  const { notify } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      await reportService.downloadCsv(reportPath, params, filename);
    } catch {
      notify("Could not export this report right now.", "error");
    } finally {
      setDownloading(false);
    }
  };

  // This report has no backend endpoint yet (e.g. call logs, SMS logs) —
  // rather than wire up a button that can't actually export anything,
  // disable it honestly instead of faking a download.
  if (!reportPath) {
    return (
      <button disabled title="Export isn't available for this report yet." className="btn-gray opacity-50">
        <Download size={14} /> Export CSV
      </button>
    );
  }

  return (
    <button onClick={handleExport} disabled={downloading} className="btn-gray">
      <Download size={14} /> {downloading ? "Exporting…" : "Export CSV"}
    </button>
  );
}
