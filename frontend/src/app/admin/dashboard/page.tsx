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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Products" value={data.stats.total_products} icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            <StatCard label="Active Products" value={data.stats.active_products} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="Orders" value={data.stats.total_orders} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            <StatCard label="Pending Orders" value={data.stats.pending_orders} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" accent />
            <StatCard label="Users" value={data.stats.total_users} icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <QuickLink href="/admin/products" label="Manage Products" desc="Catalog, stock & variants" />
            <QuickLink href="/admin/orders" label="View Orders" desc="Process & track orders" />
            <QuickLink href="/admin/coupons" label="Coupons" desc="Promotions & discounts" />
          </div>

          <div className="mt-6 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#c89e65]">Recent Orders</h2>
            <div className="mt-4 space-y-3">
              {data.recent_orders.length === 0 ? (
                <p className="text-sm text-[#d8c19a]">No recent orders.</p>
              ) : (
                data.recent_orders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#8b6f47]/20 bg-[#120f0c] px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#f2dfc0]">{order.order_number}</span>
                        <span className="text-xs text-[#c89e65]">{order.total_price_display}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#d8c19a]/50">{order.guest_name}</p>
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
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-[#c89e65]/40 bg-[#1d1810]" : "border-[#8b6f47]/30 bg-[#17120f]"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b6f47]">{label}</p>
        <svg className={`h-4 w-4 ${accent ? "text-[#c89e65]" : "text-[#8b6f47]/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-[#c89e65]" : "text-[#f2dfc0]"}`}>{value}</p>
    </div>
  );
}

function QuickLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[#8b6f47]/20 bg-[#17120f] px-4 py-3 transition hover:border-[#c89e65]/40 hover:bg-[#1d1810]"
    >
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#f2dfc0] group-hover:text-[#c89e65]">{label}</p>
        <p className="text-xs text-[#d8c19a]/50">{desc}</p>
      </div>
      <svg className="h-4 w-4 text-[#8b6f47]/40 transition group-hover:text-[#c89e65]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
