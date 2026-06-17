"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getContacts, downloadLeadsCsv } from "@/lib/api";
import { useUI } from "@/components/ui";

const PAGE_SIZE = 20;

function dateLabel(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function LeadsPage() {
  const { toast } = useUI();
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const filtersRef = useRef({ q: "", page: 1 });

  useEffect(() => {
    filtersRef.current = { q, page };
  }, [q, page]);

  const load = useCallback(async () => {
    const f = filtersRef.current;
    setLoading(true);
    try {
      const res = await getContacts({ q: f.q, page: f.page, limit: PAGE_SIZE });
      setLeads(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [q, page, load]);

  async function onExport() {
    setExporting(true);
    try {
      await downloadLeadsCsv();
      toast("Leads exported", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Leads</h2>
          <p className="text-sm text-slate-500">
            {pagination.total} contact{pagination.total === 1 ? "" : "s"} captured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or phone…"
            className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            onClick={onExport}
            disabled={exporting}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Collected data</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No leads found.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const entries = Object.entries(lead.collected || {});
                return (
                  <tr key={lead.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-medium">{lead.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{lead.phone_number}</td>
                    <td className="px-5 py-3">
                      {entries.length === 0 ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {entries.map(([key, value]) => (
                            <span
                              key={key}
                              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                            >
                              <span className="font-semibold">{key}:</span> {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {lead.status ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            lead.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {lead.status}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {dateLabel(lead.last_seen_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded px-3 py-1 text-slate-600 disabled:opacity-40 enabled:hover:bg-slate-200"
          >
            ← Prev
          </button>
          <span className="text-xs text-slate-400">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            className="rounded px-3 py-1 text-slate-600 disabled:opacity-40 enabled:hover:bg-slate-200"
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}
