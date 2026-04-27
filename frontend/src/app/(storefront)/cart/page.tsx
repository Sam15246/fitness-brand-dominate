"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppImage from "@/components/ui/AppImage";
import { clearCart, getCart, removeCartItem, type CartData, updateCartItem } from "@/lib/api";

function CartSkeleton() {
  return (
    <div className="rounded-2xl border border-[#dcc9ab] bg-[#fff8ec] p-6 text-sm text-[#6f5640]">
      Loading cart...
    </div>
  );
}

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchCart() {
      try {
        const value = await getCart();
        if (active) {
          setCart(value);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load cart");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchCart();

    return () => {
      active = false;
    };
  }, []);

  const itemCountLabel = useMemo(() => {
    if (!cart) {
      return "0 items";
    }
    return `${cart.count} item${cart.count === 1 ? "" : "s"}`;
  }, [cart]);

  async function handleQuantityChange(productId: number, quantity: number) {
    setPendingProductId(productId);
    setError(null);
    try {
      const updated = await updateCartItem(productId, quantity);
      setCart(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update quantity");
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleRemove(productId: number) {
    setPendingProductId(productId);
    setError(null);
    try {
      const updated = await removeCartItem(productId);
      setCart(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove item");
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleClear() {
    setClearing(true);
    setError(null);
    try {
      const updated = await clearCart();
      setCart(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clear cart");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[#9a7147]">Storefront</p>
            <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.05em] text-[#3b2513] sm:text-5xl">Cart</h1>
            <p className="mt-2 text-sm text-[#6f5640]">{itemCountLabel}</p>
          </div>
          <Link
            href="/products"
            className="rounded-full border border-[#c7ac84] bg-[#fff2dd] px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7e5935] hover:bg-[#f7e6c8]"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="mb-5 rounded-xl border border-[#dcc9ab] bg-[#fffaf1] p-3 text-xs text-[#6f5640] sm:text-sm">
          Fast dispatch in 24-48 hours, secure checkout, and easy returns if something is not right.
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-[#a94442]/40 bg-[#2b1414]/70 p-4 text-sm text-[#f6c5c5]">{error}</div>
        ) : null}

        {loading ? <CartSkeleton /> : null}

        {!loading && cart && cart.items.length === 0 ? (
          <div className="rounded-2xl border border-[#dcc9ab] bg-[#fff8ec] p-8 text-center">
            <p className="text-lg text-[#3b2513]">Your cart is empty.</p>
            <p className="mt-2 text-sm text-[#6f5640]">Add products to start checkout.</p>
            <div className="mt-6">
              <Link
                href="/products"
                className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#1d150e] hover:bg-[#ddb684]"
              >
                Browse Products
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && cart && cart.items.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
            <section className="space-y-4">
              {cart.items.map((item) => {
                const isPending = pendingProductId === item.product_id;
                return (
                  <article
                    key={`${item.product_id}-${item.variant_id ?? "default"}`}
                    className="rounded-2xl border border-[#dcc9ab] bg-[#fff8ec] p-4"
                  >
                    <div className="flex gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-lg border border-[#dcc9ab] bg-[#f5ebdb]">
                        {item.product.primary_image?.thumbnail_url || item.product.primary_image?.url ? (
                          <AppImage
                            src={item.product.primary_image.thumbnail_url || item.product.primary_image.url || ""}
                            alt={item.product.name}
                            width={192}
                            height={192}
                            sizes="96px"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-[#4f341f]">{item.product.name}</h2>
                          <p className="text-sm text-[#6f5640]">{item.unit_price_display} each</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="inline-flex items-center rounded-full border border-[#c7ac84] bg-[#fff2dd]">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuantityChange(item.product_id, Math.max(item.quantity - 1, 0))}
                              className="px-3 py-1 text-sm text-[#7e5935] disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-sm font-semibold text-[#4f341f]">{item.quantity}</span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                              className="px-3 py-1 text-sm text-[#7e5935] disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRemove(item.product_id)}
                            className="text-xs font-semibold uppercase tracking-[0.12em] text-[#d6988f] underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-[#6f5640]">Subtotal</p>
                        <p className="text-base font-bold text-[#6f4a2c]">{item.subtotal_display}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-2xl border border-[#dcc9ab] bg-[#fff8ec] p-5">
              <h2 className="text-sm uppercase tracking-[0.16em] text-[#8f673f]">Order Summary</h2>
              <div className="mt-4 flex items-center justify-between text-sm text-[#6f5640]">
                <span>Items</span>
                <span>{cart.count}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-base font-semibold text-[#4f341f]">
                <span>Total</span>
                <span>{cart.total_display}</span>
              </div>

              <Link
                href="/checkout"
                className="mt-6 block w-full rounded-full bg-[#c89e65] px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
              >
                Proceed to Checkout
              </Link>

              <div className="mt-4 rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-3 text-xs text-[#6f5640]">
                <p className="font-semibold uppercase tracking-[0.08em] text-[#8f673f]">Checkout Confidence</p>
                <p className="mt-1">Encrypted checkout process</p>
                <p className="mt-1">Dispatch target: 24-48 business hours</p>
                <p className="mt-1">Simple return support within policy window</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7e5935]">
                  <Link href="/shipping" className="hover:text-[#5f3f24]">
                    Shipping Policy
                  </Link>
                  <Link href="/returns" className="hover:text-[#5f3f24]">
                    Returns Policy
                  </Link>
                  <Link href="/terms" className="hover:text-[#5f3f24]">
                    Terms
                  </Link>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                className="mt-3 w-full rounded-full border border-[#c7ac84] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7e5935] hover:bg-[#f7e6c8] disabled:opacity-60"
              >
                {clearing ? "Clearing..." : "Clear Cart"}
              </button>

              <p className="mt-3 text-xs text-[#7a6048]">Need help before ordering? Contact support from the Contact page.</p>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
