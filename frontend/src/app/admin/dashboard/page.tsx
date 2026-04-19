"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { getAdminDashboard, type AdminDashboardData } from "@/lib/api";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const value = await getAdminDashboard();
        if (active) {
          setData(value);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminShell title="Dashboard" subtitle="Operational overview and recent activity.">
      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading dashboard...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="Products" value={data.stats.total_products} />
            <StatCard label="Active Products" value={data.stats.active_products} />
            <StatCard label="Orders" value={data.stats.total_orders} />
            <StatCard label="Pending Orders" value={data.stats.pending_orders} />
            <StatCard label="Users" value={data.stats.total_users} />
          </div>

          <div className="mt-6 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h2 className="text-lg font-semibold text-[#f2dfc0]">Recent Orders</h2>
            <div className="mt-4 space-y-3">
              {data.recent_orders.length === 0 ? (
                <p className="text-sm text-[#d8c19a]">No recent orders.</p>
              ) : (
                data.recent_orders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-[#f2dfc0]">{order.order_number}</p>
                      <p className="text-xs text-[#cdb793]">{order.guest_name} • {order.total_price_display}</p>
                    </div>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="rounded-full border border-[#8b6f47]/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#d8c19a] hover:bg-[#8b6f47] hover:text-[#1d150e]"
                    >
                      View
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[#b59a73]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#f2dfc0]">{value}</p>
    </div>
  );
}
