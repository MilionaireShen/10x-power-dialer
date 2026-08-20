import { useState } from "react";
import { Search } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { LEADS, LEAD_LISTS } from "../data/mockData";

export default function LeadsSearch() {
  const [query, setQuery] = useState("");
  const [listFilter, setListFilter] = useState("All Lists");

  const rows = LEADS.filter(
    (l) =>
      (listFilter === "All Lists" || l.list === listFilter) &&
      (l.name.toLowerCase().includes(query.toLowerCase()) || l.phone.includes(query) || l.city.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div>
      <ScreenHeader category="Leads" title="Lead Search" />
      <div className="p-8 space-y-4">
        <div className="card flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Search</label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, phone, or city" className="input-field pl-9" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Lead List</label>
            <select value={listFilter} onChange={(e) => setListFilter(e.target.value)} className="input-field">
              <option>All Lists</option>
              {LEAD_LISTS.map((l) => (
                <option key={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Lead List</th>
                <th className="px-5 py-3 font-medium">Last Disposition</th>
                <th className="px-5 py-3 font-medium">Times Called</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[var(--color-text-tertiary)]">
                    No leads match this search.
                  </td>
                </tr>
              ) : (
                rows.map((l, i) => (
                  <tr key={l.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 ? "bg-[var(--color-bg)]" : ""}`}>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{l.name}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.phone}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.city}, {l.state}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-tertiary)]">{l.list}</td>
                    <td className="px-5 py-3.5">
                      <span className="pill" style={{ backgroundColor: `color-mix(in srgb, ${l.lastDispositionColor} 14%, white)`, color: l.lastDispositionColor }}>
                        {l.lastDisposition}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{l.timesCalled}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
