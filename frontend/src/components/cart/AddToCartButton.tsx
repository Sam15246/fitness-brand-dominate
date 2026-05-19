"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addToCart, type ProductVariant } from "@/lib/api";
import { addLocalCartItem } from "@/lib/local-cart";

type AddToCartButtonProps = {
  productId: number;
  basePrice: number;
  basePriceDisplay: string;
  originalPrice?: number | null;
  discountPercentage?: number;
  defaultQuantity?: number;
  maxQuantity?: number;
  showBuyNow?: boolean;
  variants?: ProductVariant[];
};

export default function AddToCartButton({
  productId,
  basePrice,
  basePriceDisplay,
  originalPrice,
  discountPercentage = 0,
  defaultQuantity = 1,
  maxQuantity = 99,
  showBuyNow = true,
  variants = [],
}: AddToCartButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(defaultQuantity);

  const activeVariants = variants.filter((v) => v.is_active && (v.available_quantity ?? v.stock_quantity) > 0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    activeVariants.length === 1 ? activeVariants[0].id : null,
  );

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;
  const effectiveMax = selectedVariant ? (selectedVariant.available_quantity ?? selectedVariant.stock_quantity) : maxQuantity;
  const needsVariantSelection = activeVariants.length > 1 && !selectedVariantId;
  const lowestVariantPrice = activeVariants.length > 0
    ? Math.min(...activeVariants.map((variant) => variant.effective_price))
    : basePrice;

  function formatPrice(paise: number) {
    return `\u20B9${(paise / 100).toFixed(0)}`;
  }

  function variantLabel(v: ProductVariant): string {
    const vals = Object.values(v.option_values || {});
    return vals.length > 0 ? vals.join(" / ") : v.sku;
  }

  async function addItemToCart(nextQuantity: number) {
    return addToCart({
      product_id: productId,
      variant_id: selectedVariantId ?? undefined,
      quantity: nextQuantity,
    });
  }

  async function handleAddToCart() {
    if (needsVariantSelection) {
      setError("Please select a variant first.");
      return;
    }
    setError(null);
    setIsPending(true);

    try {
      const cart = await addItemToCart(quantity);
      setAddedCount(cart.count);
      window.dispatchEvent(new Event("cart-updated"));
    } catch {
      // Backend unreachable — fall back to localStorage cart
      try {
        const localCart = addLocalCartItem(productId, quantity, selectedVariantId);
        setAddedCount(localCart.count);
        window.dispatchEvent(new Event("cart-updated"));
      } catch (localErr) {
        setError(localErr instanceof Error ? localErr.message : "Unable to add item to cart");
      }
    } finally {
      setIsPending(false);
    }
  }

  async function handleBuyNow() {
    if (needsVariantSelection) {
      setError("Please select a variant first.");
      return;
    }
    setError(null);
    setIsBuyingNow(true);

    try {
      await addItemToCart(quantity);
      window.dispatchEvent(new Event("cart-updated"));
      router.push("/checkout");
    } catch {
      // Backend unreachable — fall back to localStorage cart
      try {
        addLocalCartItem(productId, quantity, selectedVariantId);
        window.dispatchEvent(new Event("cart-updated"));
        router.push("/checkout");
      } catch (localErr) {
        setError(localErr instanceof Error ? localErr.message : "Unable to start checkout");
      }
    } finally {
      setIsBuyingNow(false);
    }
  }

  // Compute displayed price based on selected variant
  const displayPrice = selectedVariant
    ? formatPrice(selectedVariant.effective_price)
    : activeVariants.length > 1
      ? `From ${formatPrice(lowestVariantPrice)}`
      : basePriceDisplay;
  const showOriginal = !selectedVariant && discountPercentage > 0 && originalPrice;

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-5">
      {/* Reactive price */}
      <div className="flex items-baseline gap-2 sm:gap-3">
        <span className="font-display text-[28px] sm:text-[32px] lg:text-[36px] tracking-[0.02em] text-[#302115]">
          {displayPrice}
        </span>
        {showOriginal && (
          <>
            <span className="text-[14px] text-[#9a7147] line-through">
              Rs. {(originalPrice / 100).toFixed(0)}
            </span>
            <span className="rounded-full bg-[#a67126] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f4eee4]">
              {discountPercentage}% Off
            </span>
          </>
        )}
      </div>

      {/* Variant selector */}
      {activeVariants.length > 1 && (
        <div>
          <p className="mb-2 text-[9px] sm:mb-2.5 sm:text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">Select Option</p>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {activeVariants.map((v) => {
              const isSelected = selectedVariantId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    setError(null);
                    setAddedCount(null);
                    setQuantity(1);
                  }}
                  className={`relative rounded-lg sm:rounded-xl border-2 px-3 py-2 sm:px-5 sm:py-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[#a67126] bg-[#a67126]/8 shadow-[0_0_0_2px_rgba(166,113,38,0.15)]"
                      : "border-[#d9c8ad] bg-[#fffefb] hover:border-[#c4a87a]"
                  }`}
                >
                  <span className={`block text-[12px] sm:text-[13px] font-semibold ${isSelected ? "text-[#302115]" : "text-[#4f3825]"}`}>
                    {variantLabel(v)}
                  </span>
                  <span className={`mt-0.5 block text-[11px] sm:text-[12px] ${isSelected ? "text-[#a67126]" : "text-[#6f5640]"}`}>
                    {formatPrice(v.effective_price)}
                  </span>
                  {(v.available_quantity ?? v.stock_quantity) <= 3 && (
                    <span className="mt-1 block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-[#b87a3d]">
                      Only {v.available_quantity ?? v.stock_quantity} left
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#a67126] text-white">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity stepper */}
      <div>
        <p className="mb-2 text-[9px] sm:mb-2.5 sm:text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">Quantity</p>
        <div className="inline-flex items-center rounded-xl border border-[#d9c8ad] bg-[#fffefb]">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="flex h-10 w-10 items-center justify-center text-[#6c5641] transition-colors hover:bg-[#f5e7d2] disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="w-10 text-center text-[14px] font-semibold text-[#302115]">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(effectiveMax, quantity + 1))}
            disabled={quantity >= effectiveMax}
            className="flex h-10 w-10 items-center justify-center text-[#6c5641] transition-colors hover:bg-[#f5e7d2] disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isPending}
          className="group relative inline-flex min-h-[52px] flex-1 items-center justify-center overflow-hidden rounded-full bg-[#1e1710] px-8 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14] hover:shadow-[0_4px_20px_rgba(30,23,16,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Adding...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Add to Cart
            </span>
          )}
        </button>

        {showBuyNow && (
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isBuyingNow}
            className="group relative inline-flex min-h-[52px] flex-1 items-center justify-center overflow-hidden rounded-full border-2 border-[#a67126] bg-[#a67126] px-8 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:shadow-[0_4px_20px_rgba(166,113,38,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {isBuyingNow ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting Checkout...
              </span>
            ) : (
              "Buy Now"
            )}
          </button>
        )}
      </div>

      {/* Success message */}
      {addedCount !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-[#4a7c3f]/25 bg-[#4a7c3f]/8 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-[12px] text-[#302115]">
            Added to cart.{" "}
            <Link href="/cart" className="font-semibold text-[#a67126] underline decoration-[#a67126]/30 underline-offset-2 hover:decoration-[#a67126]">
              View cart ({addedCount})
            </Link>
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-[#a94442]/25 bg-[#a94442]/8 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[12px] text-[#a94442]">{error}</p>
        </div>
      )}
    </div>
  );
}
