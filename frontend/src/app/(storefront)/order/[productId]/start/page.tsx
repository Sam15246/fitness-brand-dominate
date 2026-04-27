import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductById } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function LegacyOrderStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ qty?: string; coupon?: string; code?: string; ref?: string }>;
}) {
  const { productId } = await params;
  const query = await searchParams;

  const parsedProductId = Number(productId);
  if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
    notFound();
  }

  let product;
  try {
    product = await getProductById(parsedProductId);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      notFound();
    }
    throw error;
  }

  const qty = Math.max(1, Number(query.qty || 1) || 1);
  const coupon = (query.coupon || query.code || "").trim();
  const ref = (query.ref || "").trim();
  const formUrl = `/order/${product.id}/form?qty=${qty}${coupon ? `&coupon=${encodeURIComponent(coupon)}` : ""}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-7 shadow-[0_8px_24px_rgba(146,104,56,0.08)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Legacy Order Link</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513]">Start Order</h1>
        <p className="mt-4 text-sm text-[#6f5640]">
          You are placing an order for <span className="font-semibold text-[#f1ddbe]">{product.name}</span>.
        </p>

        <div className="mt-5 rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4 text-sm text-[#6f5640]">
          <p>Price: {product.price_display}</p>
          <p>Quantity: {qty}</p>
          {coupon ? <p>Coupon: {coupon.toUpperCase()}</p> : null}
          {ref ? <p>Referral: {ref.toUpperCase()}</p> : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={formUrl}
            className="rounded-full bg-[#c89e65] px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
          >
            Continue To Order Form
          </Link>
          <Link
            href={`/products/${encodeURIComponent(product.slug)}`}
            className="rounded-full border border-[#c7ac84] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7e5935] hover:bg-[#f7e6c8]"
          >
            View Product Page
          </Link>
        </div>
      </div>
    </div>
  );
}
