"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import { getAffiliateDashboard, type AffiliateDashboardData } from "@/lib/api";

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AffiliateDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function validateAccess() {
      try {
        setLoading(true);
        setError(null);
        const response = await getAffiliateDashboard();
        if (active) {
          setData(response);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof Error && err.message.toLowerCase().includes("authentication required")) {
          router.replace("/auth/login?next=/affiliate/dashboard");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load affiliate dashboard");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void validateAccess();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-6 text-sm text-[#d8c19a]">
          Verifying affiliate access...
        </div>
      </div>
    );
  }

  return (
    <AdminShell title="Affiliate Dashboard" subtitle="Track referrals and creator performance.">
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {data ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card label="Affiliate Code" value={data.profile.affiliate_code} />
            <Card label="Wallet Balance" value={data.profile.wallet_balance_display} />
            <Card label="Total Earned" value={data.profile.total_earned_display} />
            <Card label="Total Orders" value={String(data.stats.total_orders)} />
          </div>

          <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h2 className="text-base font-semibold text-[#f2dfc0]">Recent Referral Orders</h2>
            <div className="mt-3 space-y-2">
              {data.recent_orders.map((order) => (
                <div key={order.id} className="rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
                  <p className="text-sm text-[#f2dfc0]">{order.order_number}</p>
                  <p className="text-xs text-[#cdb793]">{order.guest_name} • {order.total_price_display}</p>
                </div>
              ))}
              {data.recent_orders.length === 0 ? <p className="text-sm text-[#d8c19a]">No referred orders yet.</p> : null}
            </div>
            <Link href="/products" className="mt-4 inline-block text-xs text-[#d8c19a] underline">Share your product links</Link>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[#b59a73]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#f2dfc0]">{value}</p>
    </div>
  );
}
