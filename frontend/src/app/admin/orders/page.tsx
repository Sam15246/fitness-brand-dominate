"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { listAdminOrders, type OrderSummary } from "@/lib/api";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);
        const result = await listAdminOrders(page, 20, status, query);
        if (active) {
          setOrders(result.orders);
          setTotalPages(Math.max(1, result.pagination.total_pages));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load orders");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOrders();
    return () => {
      active = false;
    };
  }, [page, query, status]);

  return (
    <AdminShell
      title="Orders"
      subtitle="Monitor and process customer orders."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/orders/import" className="rounded-full border border-[#8b6f47]/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d8c19a] transition hover:bg-[#8b6f47]/15">
            Bulk Import
          </Link>
          <Link href="/admin/orders/new" className="rounded-full bg-[#c89e65] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d0b09] transition hover:bg-[#ddb684]">
            + New Order
          </Link>
        </div>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <input
          value={query}
          onChange={(event) => {
            setPage(1);
            setQuery(event.target.value);
          }}
          placeholder="Search order number, name, email, phone"
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
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading orders...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-[#d8c19a]">No orders found.</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#8b6f47]/20 bg-[#120f0c] px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#f2dfc0]">{order.order_number}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-xs text-[#d8c19a]/60">
                      <span>{order.guest_name}</span>
                      <span>{order.guest_email}</span>
                      <span className="text-[#c89e65]">{order.total_price_display}</span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#c89e65] transition hover:bg-[#c89e65]/15"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
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

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#c89e65]/15 text-[#c89e65]",
  confirmed: "bg-[#4f7d9a]/15 text-[#b8d8ec]",
  shipped: "bg-[#6b5bcd]/15 text-[#c4bef0]",
  delivered: "bg-[#2b4a2b]/60 text-[#a3d9a5]",
  cancelled: "bg-[#a94442]/15 text-[#f4c2c2]",
};

function OrderStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-[#8b6f47]/15 text-[#d8c19a]";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style}`}>
      {status}
    </span>
  );
}
