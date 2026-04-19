"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getOrderByNumber, lookupOrder, type OrderSummary } from "@/lib/api";

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";
  const whatsappUrl = searchParams.get("wa") || "";
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOrderDetails() {
      if (!orderNumber) {
        return;
      }

      setLoadingOrder(true);
      try {
        const value = email
          ? await lookupOrder(orderNumber, email)
          : await getOrderByNumber(orderNumber);
        if (active) {
          setOrder(value);
        }
      } catch {
        // Confirmation page still works without details if lookup fails.
      } finally {
        if (active) {
          setLoadingOrder(false);
        }
      }
    }

    void loadOrderDetails();
    return () => {
      active = false;
    };
  }, [email, orderNumber]);

  const statusUrl = orderNumber && email
    ? `/order/status?order=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`
    : "/order/status";

  return (
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/85 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-[#b59a73]">Order Placed</p>
        <h1 className="text-brand-display mt-2 text-5xl uppercase tracking-[0.05em]">Thank You</h1>

        {orderNumber ? (
          <p className="mt-4 text-base text-[#dbc9ac]">
            Your order number is <span className="font-semibold text-[#f2dfc0]">{orderNumber}</span>.
          </p>
        ) : (
          <p className="mt-4 text-base text-[#dbc9ac]">Your order has been placed successfully.</p>
        )}

        <p className="mt-3 text-sm text-[#c8b799]">
          Complete your confirmation in WhatsApp, then you can track the order status anytime.
        </p>

        {loadingOrder ? (
          <div className="mt-6 rounded-xl border border-[#8b6f47]/25 bg-[#1b1612] p-4 text-sm text-[#d3c1a5]">Loading order details...</div>
        ) : null}

        {order ? (
          <div className="mt-6 space-y-4 text-left">
            <div className="rounded-xl border border-[#8b6f47]/25 bg-[#1b1612] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#b59a73]">Products Ordered</p>
              <div className="mt-3 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#8b6f47]/20 bg-[#16120e] p-3 text-sm">
                    <p className="font-medium text-[#eddcc0]">{item.product_name}</p>
                    <p className="mt-1 text-[#d3c1a5]">
                      Qty {item.quantity} x {item.unit_price_display} = {item.subtotal_display}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#8b6f47]/25 pt-3 text-sm text-[#d3c1a5]">
                <span>Order Total</span>
                <span className="text-base font-semibold text-[#f0dfc3]">{order.total_price_display}</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#8b6f47]/25 bg-[#1b1612] p-4 text-sm text-[#d3c1a5]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#b59a73]">Delivery Details</p>
              <p className="mt-2 font-medium text-[#eddcc0]">{order.guest_name}</p>
              <p>{order.guest_phone}</p>
              <p>{order.guest_email}</p>
              <p className="mt-2">{order.address}</p>
              <p>{order.city}, {order.state} {order.pincode}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
            >
              Open WhatsApp
            </a>
          ) : null}

          <Link
            href={statusUrl}
            className="rounded-full border border-[#8b6f47]/60 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#d8c19a] hover:bg-[#8b6f47] hover:text-[#1d150e]"
          >
            Track Order
          </Link>

          <Link
            href="/products"
            className="rounded-full border border-[#8b6f47]/45 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#cfbc9d] hover:bg-[#2a221a]"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
