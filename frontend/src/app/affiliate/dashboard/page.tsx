import Link from "next/link";

import type { AffiliateDashboardData } from "@/lib/api";
import { serverApiGet } from "@/lib/server-api";

export default async function AffiliateDashboardPage() {
  let data: AffiliateDashboardData | null = null;
  let error: string | null = null;

  try {
    data = await serverApiGet<AffiliateDashboardData>("/affiliate/dashboard");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load affiliate dashboard";
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)] md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Affiliate Program</p>
          <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513] md:text-5xl">
            Not Available
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#6f5640]">
            {error.includes("not found")
              ? "You don't have an affiliate profile yet. Contact us to join our affiliate program."
              : error}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-full border border-[#c7ac84] bg-[#c89e65] px-5 py-2 text-sm font-semibold text-[#1d150e] hover:bg-[#ddb684]"
            >
              Contact Us
            </Link>
            <Link
              href="/products"
              className="rounded-full border border-[#c7ac84] px-5 py-2 text-sm font-semibold text-[#7e5935] hover:bg-[#f7e6c8]"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)] md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Affiliate Program</p>
          <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513] md:text-5xl">
            Your Dashboard
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#6f5640]">
            Share your referral code with your audience and earn commissions on every order.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Referral Code" value={data.profile.affiliate_code} highlight />
          <StatCard label="Wallet Balance" value={data.profile.wallet_balance_display} />
          <StatCard label="Total Earned" value={data.profile.total_earned_display} />
          <StatCard label="Total Orders" value={String(data.stats.total_orders)} />
        </div>

        {/* Commission Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Pending Commissions" value={String(data.stats.pending_commissions)} />
          <StatCard label="Approved Commissions" value={String(data.stats.approved_commissions)} />
          <StatCard label="Total Redeemed" value={data.stats.total_redeemed_display} />
        </div>

        {/* Recent Referral Orders */}
        <div className="rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)] md:p-8">
          <h2 className="text-sm uppercase tracking-[0.16em] text-[#8f673f]">Recent Referral Orders</h2>

          {data.recent_orders.length === 0 ? (
            <div className="mt-4">
              <p className="text-sm text-[#6f5640]">No referred orders yet. Share your referral code to get started!</p>
              <Link
                href="/products"
                className="mt-4 inline-block rounded-full border border-[#c7ac84] bg-[#c89e65] px-5 py-2 text-sm font-semibold text-[#1d150e] hover:bg-[#ddb684]"
              >
                Browse Products to Share
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {data.recent_orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-xl border border-[#dcc9ab] bg-[#fffefb] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#4f341f]">{order.order_number}</p>
                    <p className="mt-0.5 text-xs text-[#6f5640]">{order.guest_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#6f4a2c]">{order.total_price_display}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#9a7147]">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/account/profile" className="text-[#6f5640] hover:text-[#3b2513]">My Profile</Link>
          <Link href="/account/orders" className="text-[#6f5640] hover:text-[#3b2513]">My Orders</Link>
          <Link href="/products" className="text-[#6f5640] hover:text-[#3b2513]">Shop Products</Link>
          <Link href="/contact" className="text-[#6f5640] hover:text-[#3b2513]">Support</Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8f673f]">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${highlight ? "text-[#c89e65]" : "text-[#4f341f]"}`}>
        {value}
      </p>
    </div>
  );
}
