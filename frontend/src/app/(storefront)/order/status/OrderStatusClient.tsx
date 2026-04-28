"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { lookupOrder, type OrderSummary } from "@/lib/api";

export default function OrderStatusClient() {
  const searchParams = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = useMemo(() => orderNumber.trim().length > 0 && email.trim().length > 0, [orderNumber, email]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOrder(null);

    if (!isReady) {
      setError("Order number and email are required");
      return;
    }

    setLoading(true);
    try {
      const value = await lookupOrder(orderNumber.trim().toUpperCase(), email.trim().toLowerCase());
      setOrder(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch order status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9a7147]">Order Tracking</p>
          <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.05em] text-[#3b2513]">Check Status</h1>

          <form onSubmit={handleLookup} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              placeholder="Order number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              className="rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
            />
            <input
              placeholder="Order email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#c89e65] px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60"
            >
              {loading ? "Checking..." : "Track"}
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-lg border border-[#a94442]/30 bg-[#a94442]/5 p-3 text-sm text-[#a94442]">{error}</div>
          ) : null}
        </div>

        {order ? (
          <div className="mt-6 rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#4f341f]">{order.order_number}</h2>
              <div className="text-sm text-[#6f5640]">
                Status: <span className="font-semibold text-[#4f341f]">{order.status}</span> | Shipping: <span className="font-semibold text-[#4f341f]">{order.shipping_status}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#decdb2] bg-[#fef5e8] p-3 text-sm">
                  <p className="font-medium text-[#4f341f]">{item.product_name}</p>
                  <p className="text-[#6f5640]">
                    Qty {item.quantity} x {item.unit_price_display} = {item.subtotal_display}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-[#6f5640]">
              <span>Total</span>
              <span className="text-base font-semibold text-[#4f341f]">{order.total_price_display}</span>
            </div>

            <div className="mt-4 rounded-lg border border-[#dcc9ab] bg-[#fffefb] p-3 text-sm text-[#6f5640]">
              <p className="font-semibold text-[#4f341f]">Delivery Address</p>
              <p className="mt-1">{order.address}</p>
              <p>{order.city}, {order.state} {order.pincode}</p>
            </div>

            <div className="mt-4 rounded-lg border border-[#dcc9ab] bg-[#fffefb] p-3 text-sm text-[#6f5640]">
              <p className="font-semibold text-[#4f341f]">Need help with this order?</p>
              <p className="mt-1">Check policy pages or contact support for delivery and return questions.</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#7e5935]">
                <Link href="/shipping" className="hover:text-[#3b2513]">
                  Shipping
                </Link>
                <Link href="/returns" className="hover:text-[#3b2513]">
                  Returns
                </Link>
                <Link href="/contact" className="hover:text-[#3b2513]">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
