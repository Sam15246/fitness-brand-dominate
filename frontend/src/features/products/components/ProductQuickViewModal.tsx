import Link from "next/link";

import Modal from "@/components/ui/Modal";
import AppImage from "@/components/ui/AppImage";
import type { ProductDetail } from "@/lib/api";

type ProductQuickViewModalProps = {
  product: ProductDetail;
};

export default function ProductQuickViewModal({ product }: ProductQuickViewModalProps) {
  return (
    <Modal title="Quick View">
      <div>
        <div className="flex items-center justify-end border-b border-[#8b6f47]/30 px-5 py-3">
          <Link href="/products" className="text-xs uppercase tracking-[0.16em] text-[#d8c19a] hover:text-[#f0d4a7]">
            Close
          </Link>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#8b6f47]/30 bg-[#1b1612]">
            {product.images[0]?.url ? (
              <AppImage
                src={product.images[0].url}
                alt={product.name}
                width={900}
                height={675}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-full w-full object-cover"
              />
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
    </Modal>
  );
}
