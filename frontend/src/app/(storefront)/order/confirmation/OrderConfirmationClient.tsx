"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getOrderByNumber, lookupOrder, type OrderSummary } from "@/lib/api";

export default function OrderConfirmationClient() {
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 pb-24 text-[#302115] sm:px-6 sm:py-8 md:pb-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-5 text-center shadow-[0_8px_24px_rgba(146,104,56,0.08)] sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a7147] sm:text-sm">Order Placed</p>
        <h1 className="text-brand-display mt-2 text-[clamp(36px,8vw,48px)] uppercase tracking-[0.05em] text-[#3b2513]">Thank You</h1>

        {orderNumber ? (
          <p className="mt-4 text-base text-[#6f5640]">
            Your order number is <span className="font-semibold text-[#4f341f]">{orderNumber}</span>.
          </p>
        ) : (
          <p className="mt-4 text-base text-[#6f5640]">Your order has been placed successfully.</p>
        )}

        <p className="mt-3 text-sm text-[#7a6048]">
          Complete your confirmation in WhatsApp, then you can track the order status anytime.
        </p>

        {loadingOrder ? (
          <div className="mt-6 rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4 text-sm text-[#6f5640]">Loading order details...</div>
        ) : null}

        {order ? (
          <div className="mt-6 space-y-4 text-left">
            <div className="rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8f673f]">Products Ordered</p>
              <div className="mt-3 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#decdb2] bg-[#fef5e8] p-3 text-sm">
                    <p className="font-medium text-[#4f341f]">{item.product_name}</p>
                    <p className="mt-1 text-[#6f5640]">
                      Qty {item.quantity} x {item.unit_price_display} = {item.subtotal_display}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#dcc9ab] pt-3 text-sm text-[#6f5640]">
                <span>Subtotal</span>
                <span className="text-base font-semibold text-[#4f341f]">{order.subtotal_price_display || order.total_price_display}</span>
              </div>
              {(order.discount_amount || 0) > 0 ? (
                <div className="mt-2 flex items-center justify-between text-sm text-[#4a7c3f]">
                  <span>
                    Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
                  </span>
                  <span>- {order.discount_amount_display}</span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-[#dcc9ab] pt-2 text-sm text-[#6f5640]">
                <span>Payable Total</span>
                <span className="text-base font-semibold text-[#4f341f]">{order.total_price_display}</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4 text-sm text-[#6f5640]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8f673f]">Delivery Details</p>
              <p className="mt-2 font-medium text-[#4f341f]">{order.guest_name}</p>
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
            className="rounded-full border border-[#c7ac84] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7e5935] hover:bg-[#f7e6c8]"
          >
            Track Order
          </Link>

          <Link
            href="/products"
            className="rounded-full border border-[#c7ac84] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7e5935] hover:bg-[#f7e6c8]"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4 text-left text-sm text-[#6f5640]">
          <p className="text-xs uppercase tracking-[0.14em] text-[#8f673f]">Need Help After Ordering?</p>
          <p className="mt-2">For shipping timelines, returns, or support, use the quick links below.</p>
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
            <Link href="/terms" className="hover:text-[#3b2513]">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
