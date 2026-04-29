"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppImage from "@/components/ui/AppImage";
import { clearCart, getCart, removeCartItem, type CartData, updateCartItem } from "@/lib/api";
import {
  getLocalCart,
  updateLocalCartItem,
  removeLocalCartItem,
  clearLocalCart,
} from "@/lib/local-cart";

function CartSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-4 sm:p-5">
          <div className="flex gap-4">
            <div className="h-20 w-20 animate-pulse rounded-xl bg-[#e4d3b7] sm:h-24 sm:w-24" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#e4d3b7]" />
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-[#e4d3b7]" />
              <div className="h-9 w-28 animate-pulse rounded-xl bg-[#e4d3b7]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingLocal, setUsingLocal] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchCart() {
      try {
        const value = await getCart();
        if (active) setCart(value);
      } catch {
        // Backend unreachable — fall back to localStorage cart
        if (active) {
          const local = getLocalCart();
          setCart(local);
          setUsingLocal(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchCart();
    return () => { active = false; };
  }, []);

  const itemCountLabel = useMemo(() => {
    if (!cart) return "0 items";
    return `${cart.count} item${cart.count === 1 ? "" : "s"}`;
  }, [cart]);

  async function handleQuantityChange(productId: number, quantity: number) {
    setPendingProductId(productId);
    setError(null);
    try {
      if (usingLocal) {
        const updated = updateLocalCartItem(productId, quantity);
        setCart(updated);
      } else {
        const updated = await updateCartItem(productId, quantity);
        setCart(updated);
      }
      window.dispatchEvent(new Event("cart-updated"));
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
      if (usingLocal) {
        const updated = removeLocalCartItem(productId);
        setCart(updated);
      } else {
        const updated = await removeCartItem(productId);
        setCart(updated);
      }
      window.dispatchEvent(new Event("cart-updated"));
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
      if (usingLocal) {
        const updated = clearLocalCart();
        setCart(updated);
      } else {
        const updated = await clearCart();
        setCart(updated);
      }
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clear cart");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff8ec]">
      {/* Header */}
      <div className="border-b border-[#d9c8ad]/40 bg-[#fff8ec]">
        <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Your Cart</p>
              <h1 className="mt-2 font-display text-[clamp(28px,5vw,44px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
                Shopping Cart
              </h1>
              <p className="mt-2 text-[13px] text-[#6c5641]">{itemCountLabel}</p>
            </div>
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 rounded-full border border-[#d9c8ad] bg-[#fffefb] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6c5641] transition-all hover:border-[#a67126] hover:text-[#302115]"
            >
              <svg className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        {/* Trust strip */}
        <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl border border-[#d9c8ad]/60 bg-[#fffefb] px-3 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-6 sm:px-4">
          <div className="flex flex-col items-center gap-1 text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9a7147] sm:flex-row sm:gap-2 sm:text-[10px]">
            <svg className="h-4 w-4 text-[#a67126]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            24-48h Dispatch
          </div>
          <div className="flex flex-col items-center gap-1 text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9a7147] sm:flex-row sm:gap-2 sm:text-[10px]">
            <svg className="h-4 w-4 text-[#a67126]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure Checkout
          </div>
          <div className="flex flex-col items-center gap-1 text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9a7147] sm:flex-row sm:gap-2 sm:text-[10px]">
            <svg className="h-4 w-4 text-[#a67126]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Easy Returns
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#a94442]/25 bg-[#a94442]/8 px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[12px] text-[#a94442]">{error}</p>
          </div>
        )}

        {loading && <CartSkeleton />}

        {/* Empty state */}
        {!loading && cart && cart.items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d9c8ad] bg-[#fffefb] py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f5e7d2]">
              <svg className="h-9 w-9 text-[#a67126]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="mt-5 font-display text-[24px] uppercase tracking-[0.04em] text-[#302115]">
              Your Cart Is Empty
            </p>
            <p className="mt-2 text-[13px] text-[#6c5641]">
              Add products to start checkout.
            </p>
            <Link
              href="/products"
              className="group relative mt-6 inline-flex overflow-hidden rounded-full bg-[#1e1710] px-7 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14] hover:shadow-[0_4px_20px_rgba(30,23,16,0.25)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Browse Products</span>
            </Link>
          </div>
        )}

        {/* Cart items + summary */}
        {!loading && cart && cart.items.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
            {/* Items list */}
            <section className="space-y-4">
              {cart.items.map((item) => {
                const isPending = pendingProductId === item.product_id;
                return (
                  <article
                    key={`${item.product_id}-${item.variant_id ?? "default"}`}
                    className={`rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-4 transition-all sm:p-5 ${isPending ? "opacity-60" : ""}`}
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#d9c8ad] bg-[#f5ebdb] sm:h-24 sm:w-24"
                      >
                        {item.product.primary_image?.thumbnail_url || item.product.primary_image?.url ? (
                          <AppImage
                            src={item.product.primary_image.thumbnail_url || item.product.primary_image.url || ""}
                            alt={item.product.name}
                            width={192}
                            height={192}
                            sizes="96px"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[8px] uppercase tracking-[0.2em] text-[#b5a08a]">
                            No img
                          </div>
                        )}
                      </Link>

                      {/* Info */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                        <div>
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="text-[14px] font-semibold text-[#302115] transition-colors hover:text-[#a67126] sm:text-[15px]"
                          >
                            {item.product.name}
                          </Link>
                          {item.variant_label && (
                            <span className="mt-1 inline-block rounded-md border border-[#d9c8ad] bg-[#fff8ec] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9a7147]">
                              {item.variant_label}
                            </span>
                          )}
                          <p className="mt-0.5 text-[12px] text-[#6c5641]">
                            {item.unit_price_display} each
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Quantity stepper */}
                          <div className="inline-flex items-center rounded-xl border border-[#d9c8ad] bg-[#fffefb]">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuantityChange(item.product_id, Math.max(item.quantity - 1, 0))}
                              className="flex h-9 w-9 items-center justify-center text-[#6c5641] transition-colors hover:bg-[#f5e7d2] disabled:opacity-30"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="w-8 text-center text-[13px] font-semibold text-[#302115]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                              className="flex h-9 w-9 items-center justify-center text-[#6c5641] transition-colors hover:bg-[#f5e7d2] disabled:opacity-30"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRemove(item.product_id)}
                            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a94442]/70 transition-colors hover:text-[#a94442] disabled:opacity-50"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Subtotal — right side */}
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9a7147]">Subtotal</p>
                        <p className="mt-1 font-display text-[20px] tracking-[0.02em] text-[#302115]">
                          {item.subtotal_display}
                        </p>
                      </div>
                    </div>

                    {/* Mobile subtotal */}
                    <div className="mt-3 flex items-center justify-between border-t border-[#d9c8ad]/40 pt-3 sm:hidden">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9a7147]">Subtotal</span>
                      <span className="font-display text-[18px] tracking-[0.02em] text-[#302115]">{item.subtotal_display}</span>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Order summary sidebar */}
            <aside className="h-fit space-y-4 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126]">Order Summary</h2>

                <div className="mt-5 space-y-3 border-b border-[#d9c8ad]/50 pb-4">
                  <div className="flex items-center justify-between text-[13px] text-[#6c5641]">
                    <span>Items ({cart.count})</span>
                    <span className="font-medium text-[#302115]">{cart.total_display}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-[#6c5641]">
                    <span>Shipping</span>
                    <span className="text-[#4a7c3f]">Calculated at checkout</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#302115]">Total</span>
                  <span className="font-display text-[28px] tracking-[0.02em] text-[#302115]">
                    {cart.total_display}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  className="group relative mt-6 flex w-full items-center justify-center overflow-hidden rounded-full bg-[#a67126] px-6 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:shadow-[0_4px_20px_rgba(166,113,38,0.3)]"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative flex items-center gap-2">
                    Proceed to Checkout
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={clearing}
                  className="mt-3 w-full rounded-full border border-[#d9c8ad] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a7147] transition-all hover:border-[#a94442]/30 hover:bg-[#a94442]/5 hover:text-[#a94442] disabled:opacity-60"
                >
                  {clearing ? "Clearing..." : "Clear Cart"}
                </button>
              </div>

              {/* Confidence box */}
              <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126]">
                  Checkout Confidence
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-[12px] leading-[1.6] text-[#6c5641]">Encrypted checkout process</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-[12px] leading-[1.6] text-[#6c5641]">Dispatch in 24-48 business hours</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-[12px] leading-[1.6] text-[#6c5641]">Simple returns within policy window</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 border-t border-[#d9c8ad]/40 pt-3">
                  <Link href="/shipping" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a67126] transition-colors hover:text-[#8b5d1e]">
                    Shipping
                  </Link>
                  <Link href="/returns" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a67126] transition-colors hover:text-[#8b5d1e]">
                    Returns
                  </Link>
                  <Link href="/terms" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a67126] transition-colors hover:text-[#8b5d1e]">
                    Terms
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
