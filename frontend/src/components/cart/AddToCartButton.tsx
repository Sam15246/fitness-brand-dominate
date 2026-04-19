"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addToCart } from "@/lib/api";

type AddToCartButtonProps = {
  productId: number;
  defaultQuantity?: number;
  maxQuantity?: number;
  showBuyNow?: boolean;
};

export default function AddToCartButton({
  productId,
  defaultQuantity = 1,
  maxQuantity = 99,
  showBuyNow = true,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(defaultQuantity);

  async function addItemToCart(nextQuantity: number) {
    return addToCart({
      product_id: productId,
      quantity: nextQuantity,
    });
  }

  async function handleAddToCart() {
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
    <div className="space-y-3">
      <div>
        <label htmlFor={`qty-${productId}`} className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#b59a73]">
          Quantity
        </label>
        <input
          id={`qty-${productId}`}
          type="number"
          min={1}
          max={maxQuantity}
          value={quantity}
          onChange={(event) => {
            const parsed = Number(event.target.value) || 1;
            setQuantity(Math.min(Math.max(parsed, 1), Math.max(maxQuantity, 1)));
          }}
          className="w-24 rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
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
          className="rounded-full border border-[#9f8157] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#f1ddbe] transition hover:bg-[#8b6f47] hover:text-[#17110c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBuyingNow ? "Starting Checkout..." : "Buy Now"}
        </button>
      ) : null}

      {addedCount !== null ? (
        <p className="text-xs uppercase tracking-[0.14em] text-[#cfb388]">
          Added to cart. <Link href="/cart" className="text-[#f1d6ab] underline">View cart ({addedCount})</Link>
        </p>
      ) : null}

      {error ? <p className="text-sm text-[#f0a6a0]">{error}</p> : null}
    </div>
  );
}
