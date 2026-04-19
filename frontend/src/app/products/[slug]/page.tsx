import Link from "next/link";
import { notFound } from "next/navigation";

import ReviewSubmissionCard from "@/components/reviews/ReviewSubmissionCard";
import { AddToCartButton } from "@/features/cart";
import { fetchProductBySlug } from "@/features/products";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product;
  try {
    product = await fetchProductBySlug(slug);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/products" className="text-xs uppercase tracking-[0.18em] text-[#b59a73] hover:text-[#d8c19a]">
            Back to products
          </Link>
          <Link href="/cart" className="text-xs uppercase tracking-[0.18em] text-[#b59a73] hover:text-[#d8c19a]">
            View cart
          </Link>
        </div>

        <section className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#8b6f47]/30 bg-[#171411]">
              {product.images[0]?.url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-[#9f8a6b]">
                  No image
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((image) => (
                <div key={image.id} className="aspect-square overflow-hidden rounded-lg border border-[#8b6f47]/25 bg-[#171411]">
                  {image.thumbnail_url || image.url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.thumbnail_url || image.url || ""}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-[#b59a73]">DOMINATE Product</p>
            <h1 className="text-brand-display mt-2 text-5xl uppercase tracking-[0.04em]">{product.name}</h1>
            <p className="mt-4 text-base leading-7 text-[#d7c7ad]">{product.description}</p>

            <div className="mt-6 flex items-center gap-4">
              <span className="text-2xl font-bold text-[#f0d4a7]">{product.price_display}</span>
              {product.discount_percentage > 0 ? (
                <span className="rounded-full border border-[#8b6f47]/50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#e0c59f]">
                  {product.discount_percentage}% off
                </span>
              ) : null}
            </div>

            <div className="mt-6">
              <AddToCartButton productId={product.id} defaultQuantity={1} maxQuantity={product.stock_quantity} showBuyNow />
            </div>

            <p className="mt-2 text-sm text-[#c7b69d]">{product.review_count} reviews</p>

            <div className="mt-8 rounded-xl border border-[#8b6f47]/30 bg-[#15120f]/80 p-4">
              <h2 className="text-sm uppercase tracking-[0.2em] text-[#d8c19a]">Variants</h2>
              {product.variants.length === 0 ? (
                <p className="mt-2 text-sm text-[#c7b69d]">No variants configured.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-[#e5d7c1]">
                  {product.variants.map((variant) => (
                    <li key={variant.id} className="rounded-lg border border-[#8b6f47]/20 bg-[#1c1712]/70 px-3 py-2">
                      <span className="font-semibold">{variant.sku}</span>
                      <span className="ml-2 text-[#c7b69d]">Stock: {variant.stock_quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/80 p-6">
          <h2 className="text-brand-display text-3xl uppercase tracking-[0.05em] text-[#e9d3ae]">Reviews</h2>
          {product.reviews.length === 0 ? (
            <p className="mt-3 text-sm text-[#c7b69d]">No approved reviews yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {product.reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-[#8b6f47]/25 bg-[#1b1612]/80 p-4">
                  <p className="text-sm font-semibold text-[#f1ddbe]">{review.name}</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-[#b59a73]">{review.rating} / 5</p>
                  {review.title ? <p className="mt-2 text-sm font-medium text-[#ebdbc3]">{review.title}</p> : null}
                  <p className="mt-2 text-sm text-[#d7c7ad]">{review.comment}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <ReviewSubmissionCard slug={product.slug} />
      </div>
    </div>
  );
}
