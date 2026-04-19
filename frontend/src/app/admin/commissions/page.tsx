"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { listAdminCommissions, updateAdminCommission, type AdminCommission } from "@/lib/api";

export default function AdminCommissionsPage() {
  const [items, setItems] = useState<AdminCommission[]>([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await listAdminCommissions(page, 20, status, q);
        if (active) {
          setItems(response.items);
          setTotalPages(Math.max(1, response.pagination.total_pages));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load commissions");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [page, q, status]);

  async function handleCommissionStatus(orderId: number, nextStatus: "pending" | "approved" | "rejected") {
    setSavingOrderId(orderId);
    setError(null);
    try {
      const updated = await updateAdminCommission(orderId, nextStatus);
      setItems((prev) => prev.map((item) => (item.order_id === orderId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update commission");
    } finally {
      setSavingOrderId(null);
    }
  }

  return (
    <AdminShell title="Commissions" subtitle="Review and approve affiliate commissions.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <input
          value={q}
          onChange={(event) => {
            setPage(1);
            setQ(event.target.value);
          }}
          placeholder="Search commissions"
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading commissions...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.order_id} className="rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
                <p className="text-sm font-medium text-[#f2dfc0]">{item.order_number} • {item.commission_amount_display}</p>
                <p className="text-xs text-[#cdb793]">{item.affiliate_name || "Unknown affiliate"} • {item.commission_status}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    disabled={savingOrderId === item.order_id}
                    onClick={() => handleCommissionStatus(item.order_id, "approved")}
                    className="rounded border border-[#5b8f45]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c7e5b9] disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    disabled={savingOrderId === item.order_id}
                    onClick={() => handleCommissionStatus(item.order_id, "rejected")}
                    className="rounded border border-[#a94442]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f4c2c2] disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-[#d8c19a]">No commissions found.</p> : null}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-md border border-[#8b6f47]/60 px-3 py-1 text-xs text-[#d8c19a] disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs text-[#cdb793]">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-md border border-[#8b6f47]/60 px-3 py-1 text-xs text-[#d8c19a] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
