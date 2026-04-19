"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import { getAdminCouponStats, type AdminCouponStats } from "@/lib/api";

export default function AdminCouponStatsPage() {
  const params = useParams<{ couponId: string }>();
  const couponId = Number(params.couponId || 0);
  const [data, setData] = useState<AdminCouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!couponId || Number.isNaN(couponId)) {
        setError("Invalid coupon id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getAdminCouponStats(couponId);
        if (active) {
          setData(response);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load coupon stats");
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
  }, [couponId]);

  return (
    <AdminShell title="Coupon Stats" subtitle={`Coupon ID: ${couponId || "-"}`}>
      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading stats...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {data ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <p className="text-sm text-[#f2dfc0]">{data.coupon.code} • {data.coupon.discount_display}</p>
            <p className="text-xs text-[#cdb793]">Orders: {data.summary.total_orders} • Uses: {data.summary.current_uses}/{data.summary.max_uses ?? "∞"}</p>
            <Link href={`/admin/coupons/${couponId}/edit`} className="mt-2 inline-block text-xs text-[#d8c19a] underline">Edit coupon</Link>
          </div>

          <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#d8c19a]">Recent Orders</h3>
            <div className="space-y-2">
              {data.recent_orders.map((order) => (
                <div key={order.id} className="rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
                  <p className="text-sm text-[#f2dfc0]">{order.order_number}</p>
                  <p className="text-xs text-[#cdb793]">{order.guest_name} • {order.total_price_display}</p>
                </div>
              ))}
              {data.recent_orders.length === 0 ? <p className="text-sm text-[#d8c19a]">No recent orders for this coupon.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
