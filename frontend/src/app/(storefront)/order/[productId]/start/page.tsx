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
    <div className="min-h-screen bg-[#0d0b09] px-6 py-14 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/85 p-7">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b59a73]">Legacy Order Link</p>
        <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#eed8b1]">Start Order</h1>
        <p className="mt-4 text-sm text-[#d4c4a7]">
          You are placing an order for <span className="font-semibold text-[#f1ddbe]">{product.name}</span>.
        </p>

        <div className="mt-5 rounded-xl border border-[#8b6f47]/25 bg-[#1a1510] p-4 text-sm text-[#d7c7ad]">
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
            className="rounded-full border border-[#8b6f47]/45 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d8c19a] hover:bg-[#8b6f47]/20"
          >
            View Product Page
          </Link>
        </div>
      </div>
    </div>
  );
}
