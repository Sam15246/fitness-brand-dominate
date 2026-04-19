"use client";

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
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/85 p-6">
          <p className="text-sm uppercase tracking-[0.28em] text-[#b59a73]">Order Tracking</p>
          <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.05em]">Check Status</h1>

          <form onSubmit={handleLookup} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              placeholder="Order number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              className="rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
            />
            <input
              placeholder="Order email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
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
            <div className="mt-4 rounded-lg border border-[#a94442]/40 bg-[#2b1414]/70 p-3 text-sm text-[#f6c5c5]">{error}</div>
          ) : null}
        </div>

        {order ? (
          <div className="mt-6 rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/90 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#f2dfc0]">{order.order_number}</h2>
              <div className="text-sm text-[#d3c1a5]">
                Status: <span className="font-semibold text-[#f0dfc3]">{order.status}</span> | Shipping: <span className="font-semibold text-[#f0dfc3]">{order.shipping_status}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#8b6f47]/25 bg-[#1b1612] p-3 text-sm">
                  <p className="font-medium text-[#eddcc0]">{item.product_name}</p>
                  <p className="text-[#d3c1a5]">
                    Qty {item.quantity} x {item.unit_price_display} = {item.subtotal_display}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-[#d3c1a5]">
              <span>Total</span>
              <span className="text-base font-semibold text-[#f0dfc3]">{order.total_price_display}</span>
            </div>

            <div className="mt-4 rounded-lg border border-[#8b6f47]/25 bg-[#1b1612] p-3 text-sm text-[#d3c1a5]">
              <p className="font-semibold text-[#eddcc0]">Delivery Address</p>
              <p className="mt-1">{order.address}</p>
              <p>{order.city}, {order.state} {order.pincode}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
