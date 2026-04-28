"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { addToCart, getProductById, type ProductDetail } from "@/lib/api";

export default function LegacyOrderFormClient() {
  const router = useRouter();
  const params = useParams<{ productId: string }>();
  const searchParams = useSearchParams();
  const initialQty = Math.max(1, Number(searchParams.get("qty") || 1) || 1);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [quantity, setQuantity] = useState(initialQty);
  const [coupon, setCoupon] = useState((searchParams.get("coupon") || searchParams.get("code") || "").trim().toUpperCase());
  const [referralCode, setReferralCode] = useState((searchParams.get("ref") || "").trim().toUpperCase());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productId = Number(params.productId);
  const isValidProductId = Number.isFinite(productId) && productId > 0;

  useEffect(() => {
    if (!isValidProductId) {
      return;
    }

    let active = true;

    async function loadProduct() {
      try {
        const result = await getProductById(productId);
        if (active) {
          setProduct(result);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load product");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProduct();
    return () => {
      active = false;
    };
  }, [isValidProductId, productId]);

  if (!isValidProductId) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-7 shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
          <p className="text-sm text-[#a94442]">Invalid product reference</p>
          <Link href="/products" className="mt-4 inline-block text-sm text-[#7e5935] hover:text-[#3b2513]">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  async function handleContinue() {
    if (!product) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addToCart({ product_id: product.id, quantity: Math.max(1, quantity) });
      const query = new URLSearchParams();
      if (coupon) {
        query.set("coupon", coupon);
      }
      if (referralCode) {
        query.set("ref", referralCode);
      }
      const queryString = query.toString();
      router.push(`/checkout${queryString ? `?${queryString}` : ""}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to continue checkout");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-7 text-sm text-[#6f5640] shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
          Loading order form...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-7 shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
          <p className="text-sm text-[#a94442]">{error || "Product not found"}</p>
          <Link href="/products" className="mt-4 inline-block text-sm text-[#7e5935] hover:text-[#3b2513]">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-7 shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Legacy Order Form</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513]">{product.name}</h1>

        <div className="mt-5 rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4">
          <p className="text-sm text-[#6f5640]">Price: {product.price_display}</p>
          <p className="mt-1 text-xs text-[#8f673f]">Choose quantity and continue to checkout.</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[#6f5640]" htmlFor="legacy-order-qty">
            Quantity
            <input
              id="legacy-order-qty"
              type="number"
              min={1}
              max={Math.max(product.stock_quantity || 1, 1)}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              className="mt-1 w-full rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
            />
          </label>

          <label className="text-sm text-[#6f5640]" htmlFor="legacy-order-coupon">
            Coupon code (optional)
            <input
              id="legacy-order-coupon"
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
            />
          </label>

          <label className="text-sm text-[#6f5640]" htmlFor="legacy-order-referral">
            Referral code (optional)
            <input
              id="legacy-order-referral"
              value={referralCode}
              onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-[#a94442]">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleContinue}
            disabled={submitting}
            className="rounded-full bg-[#c89e65] px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60"
          >
            {submitting ? "Continuing..." : "Continue To Checkout"}
          </button>
          <Link
            href={`/products/${encodeURIComponent(product.slug)}`}
            className="rounded-full border border-[#c7ac84] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7e5935] hover:bg-[#f7e6c8]"
          >
            Back To Product
          </Link>
        </div>
      </div>
    </div>
  );
}
