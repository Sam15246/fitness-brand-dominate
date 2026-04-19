import Link from "next/link";

import type { ProductDetail } from "@/lib/api";

type ProductQuickViewModalProps = {
  product: ProductDetail;
};

export default function ProductQuickViewModal({ product }: ProductQuickViewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#8b6f47]/40 bg-[#14100d] text-[#f4eee4] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#8b6f47]/30 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#c7ac85]">Quick View</p>
          <Link href="/products" className="text-xs uppercase tracking-[0.16em] text-[#d8c19a] hover:text-[#f0d4a7]">
            Close
          </Link>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#8b6f47]/30 bg-[#1b1612]">
            {product.images[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.18em] text-[#9f8a6b]">
                No image
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-[#f4eee4]">{product.name}</h2>
            <p className="mt-2 text-sm text-[#d7c7ad]">{product.description}</p>
            <p className="mt-4 text-xl font-bold text-[#f0d4a7]">{product.price_display}</p>

            <div className="mt-6 flex gap-2">
              <Link
                href={`/products/${product.slug}`}
                className="rounded-full bg-[#8b6f47] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a130d] hover:bg-[#a1845d]"
              >
                Full Details
              </Link>
              <Link
                href="/products"
                className="rounded-full border border-[#8b6f47]/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f2e7d4] hover:border-[#b59a73]"
              >
                Keep Browsing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
