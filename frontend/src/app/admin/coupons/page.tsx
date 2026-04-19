"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { deleteAdminCoupon, listAdminCoupons, toggleAdminCoupon, type AdminCoupon } from "@/lib/api";

export default function AdminCouponsPage() {
  const [items, setItems] = useState<AdminCoupon[]>([]);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingCouponId, setSavingCouponId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await listAdminCoupons(page, 20, type, status, q);
        if (active) {
          setItems(response.items);
          setTotalPages(Math.max(1, response.pagination.total_pages));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load coupons");
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
  }, [page, q, status, type]);

  async function handleToggle(coupon: AdminCoupon) {
    setSavingCouponId(coupon.id);
    setError(null);
    try {
      const updated = await toggleAdminCoupon(coupon.id);
      setItems((prev) => prev.map((item) => (item.id === coupon.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coupon status");
    } finally {
      setSavingCouponId(null);
    }
  }

  async function handleDelete(coupon: AdminCoupon) {
    const confirmed = window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setSavingCouponId(coupon.id);
    setError(null);
    try {
      await deleteAdminCoupon(coupon.id);
      setItems((prev) => prev.filter((item) => item.id !== coupon.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete coupon");
    } finally {
      setSavingCouponId(null);
    }
  }

  return (
    <AdminShell title="Coupons" subtitle="Manage affiliate and promotional coupon codes.">
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <input
          value={q}
          onChange={(event) => {
            setPage(1);
            setQ(event.target.value);
          }}
          placeholder="Search coupons"
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        />
        <select
          value={type}
          onChange={(event) => {
            setPage(1);
            setType(event.target.value);
          }}
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        >
          <option value="all">All types</option>
          <option value="affiliate">Affiliate</option>
          <option value="promotional">Promotional</option>
          <option value="seasonal">Seasonal</option>
          <option value="loyalty">Loyalty</option>
        </select>
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading coupons...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
                <p className="text-sm font-medium text-[#f2dfc0]">{item.code} • {item.discount_display}</p>
                <p className="text-xs text-[#cdb793]">{item.coupon_type} • Uses {item.current_uses}/{item.max_uses ?? "∞"} • {item.is_active ? "Active" : "Inactive"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/coupons/${item.id}/edit`}
                    className="rounded-full border border-[#8b6f47]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8c19a] hover:bg-[#8b6f47] hover:text-[#1d150e]"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/coupons/${item.id}/stats`}
                    className="rounded-full border border-[#4f7d9a]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b8d8ec] hover:bg-[#4f7d9a] hover:text-[#0f1a22]"
                  >
                    Stats
                  </Link>
                  <button
                    disabled={savingCouponId === item.id}
                    onClick={() => void handleToggle(item)}
                    className="rounded-full border border-[#5b8f45]/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c7e5b9] disabled:opacity-40"
                  >
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    disabled={savingCouponId === item.id}
                    onClick={() => void handleDelete(item)}
                    className="rounded-full border border-[#a94442]/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f4c2c2] disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-[#d8c19a]">No coupons found.</p> : null}
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
