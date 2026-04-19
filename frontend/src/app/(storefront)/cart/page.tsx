"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppImage from "@/components/ui/AppImage";
import { clearCart, getCart, removeCartItem, type CartData, updateCartItem } from "@/lib/api";

function CartSkeleton() {
  return (
    <div className="rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/80 p-6 text-sm text-[#d4c4a7]">
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
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#b59a73]">Storefront</p>
            <h1 className="text-brand-display mt-2 text-5xl uppercase tracking-[0.05em]">Cart</h1>
            <p className="mt-2 text-sm text-[#ccbca1]">{itemCountLabel}</p>
          </div>
          <Link
            href="/products"
            className="rounded-full border border-[#8b6f47]/50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d9c19a] hover:bg-[#8b6f47] hover:text-[#1d150e]"
          >
            Continue Shopping
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-[#a94442]/40 bg-[#2b1414]/70 p-4 text-sm text-[#f6c5c5]">{error}</div>
        ) : null}

        {loading ? <CartSkeleton /> : null}

        {!loading && cart && cart.items.length === 0 ? (
          <div className="rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/80 p-8 text-center">
            <p className="text-lg text-[#e7d5ba]">Your cart is empty.</p>
            <p className="mt-2 text-sm text-[#c5b395]">Add products to start checkout.</p>
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
                    className="rounded-2xl border border-[#8b6f47]/25 bg-[#15120f]/85 p-4"
                  >
                    <div className="flex gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-lg border border-[#8b6f47]/20 bg-[#1b1612]">
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
                          <h2 className="text-base font-semibold text-[#f0dfc3]">{item.product.name}</h2>
                          <p className="text-sm text-[#cdbca1]">{item.unit_price_display} each</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="inline-flex items-center rounded-full border border-[#8b6f47]/40 bg-[#1d1813]">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuantityChange(item.product_id, Math.max(item.quantity - 1, 0))}
                              className="px-3 py-1 text-sm text-[#d7c4a8] disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-sm font-semibold text-[#f0dfc3]">{item.quantity}</span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                              className="px-3 py-1 text-sm text-[#d7c4a8] disabled:opacity-50"
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
                        <p className="text-sm text-[#cdbca1]">Subtotal</p>
                        <p className="text-base font-bold text-[#f0d4a7]">{item.subtotal_display}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/90 p-5">
              <h2 className="text-sm uppercase tracking-[0.2em] text-[#d8c19a]">Order Summary</h2>
              <div className="mt-4 flex items-center justify-between text-sm text-[#d3c1a5]">
                <span>Items</span>
                <span>{cart.count}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-base font-semibold text-[#f0dfc3]">
                <span>Total</span>
                <span>{cart.total_display}</span>
              </div>

              <Link
                href="/checkout"
                className="mt-6 block w-full rounded-full bg-[#c89e65] px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
              >
                Proceed to Checkout
              </Link>

              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                className="mt-3 w-full rounded-full border border-[#8b6f47]/50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#d8c19a] hover:bg-[#8b6f47] hover:text-[#1d150e] disabled:opacity-60"
              >
                {clearing ? "Clearing..." : "Clear Cart"}
              </button>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
