"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addToCart, type ProductVariant } from "@/lib/api";

type AddToCartButtonProps = {
  productId: number;
  defaultQuantity?: number;
  maxQuantity?: number;
  showBuyNow?: boolean;
  variants?: ProductVariant[];
};

export default function AddToCartButton({
  productId,
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

  const activeVariants = variants.filter((v) => v.is_active && v.stock_quantity > 0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    activeVariants.length === 1 ? activeVariants[0].id : null,
  );

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;
  const effectiveMax = selectedVariant ? selectedVariant.stock_quantity : maxQuantity;
  const needsVariantSelection = activeVariants.length > 1 && !selectedVariantId;

  function formatPrice(paise: number) {
    return `\u20B9${(paise / 100).toFixed(2)}`;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add item to cart");
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
      router.push("/checkout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout");
    } finally {
      setIsBuyingNow(false);
    }
  }

  return (
    <div className="space-y-4">
      {activeVariants.length > 1 ? (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#9a7147]">Select Option</p>
          <div className="flex flex-wrap gap-2">
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
                  className={`relative rounded-xl border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "border-[#c89e65] bg-[#fff2dd] shadow-[0_0_0_1px_#c89e65]"
                      : "border-[#dcc9ab] bg-[#fffefb] hover:border-[#c4a87a] hover:bg-[#fef8ee]"
                  }`}
                >
                  <span className={`block text-sm font-semibold ${isSelected ? "text-[#6f4a2c]" : "text-[#4f3825]"}`}>
                    {variantLabel(v)}
                  </span>
                  <span className={`mt-0.5 block text-xs ${isSelected ? "text-[#8b5e34]" : "text-[#6f5640]"}`}>
                    {formatPrice(v.effective_price)}
                  </span>
                  {v.stock_quantity <= 3 ? (
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-[#b87a3d]">
                      Only {v.stock_quantity} left
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor={`qty-${productId}`} className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#9a7147]">
          Quantity
        </label>
        <input
          id={`qty-${productId}`}
          type="number"
          min={1}
          max={effectiveMax}
          value={quantity}
          onChange={(event) => {
            const parsed = Number(event.target.value) || 1;
            setQuantity(Math.min(Math.max(parsed, 1), Math.max(effectiveMax, 1)));
          }}
          className="w-24 rounded-lg border border-[#dcc9ab] bg-[#fffefb] px-3 py-2 text-sm text-[#3b2513] outline-none focus:border-[#c89e65]"
        />
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isPending}
        className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#1d150e] transition hover:bg-[#ddb684] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Adding..." : "Add to Cart"}
      </button>

      {showBuyNow ? (
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={isBuyingNow}
          className="rounded-full border border-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6f4a2c] transition hover:bg-[#c89e65] hover:text-[#1d150e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBuyingNow ? "Starting Checkout..." : "Buy Now"}
        </button>
      ) : null}

      {addedCount !== null ? (
        <p className="text-xs uppercase tracking-[0.14em] text-[#8b5e34]">
          Added to cart.{" "}
          <Link href="/cart" className="text-[#c89e65] underline">
            View cart ({addedCount})
          </Link>
        </p>
      ) : null}

      {error ? <p className="text-sm text-[#a94442]">{error}</p> : null}
    </div>
  );
}
