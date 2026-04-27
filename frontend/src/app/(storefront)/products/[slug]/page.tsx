import Link from "next/link";
import { notFound } from "next/navigation";

import ImageGallery from "@/components/product/ImageGallery";
import ReviewSubmissionCard from "@/components/reviews/ReviewSubmissionCard";
import { AddToCartButton } from "@/features/cart";
import { fetchProductBySlug } from "@/features/products";

export const revalidate = 120;

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.14em]">
          <Link href="/products" className="text-[#8f673f] hover:text-[#6e4d2f]">
            Back to products
          </Link>
          <Link href="/cart" className="text-[#8f673f] hover:text-[#6e4d2f]">
            View cart
          </Link>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <ImageGallery images={product.images} productName={product.name} />

          <div className="rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-5 shadow-[0_8px_24px_rgba(146,104,56,0.08)] sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[#9a7147]">DOMINATE Product</p>
            <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.04em] text-[#3b2513] sm:text-5xl">{product.name}</h1>
            <p className="mt-4 text-sm leading-6 text-[#6f5640] sm:text-base sm:leading-7">{product.description}</p>

            <div className="mt-6 flex items-center gap-4">
              <span className="text-2xl font-bold text-[#6f4a2c]">{product.price_display}</span>
              {product.discount_percentage > 0 ? (
                <span className="rounded-full border border-[#c7ac84] bg-[#fff2dd] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[#8b5e34]">
                  {product.discount_percentage}% off
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#dcc9ab] bg-[#fef5e8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b4a2e]">
                {product.in_stock ? "In stock" : "Out of stock"}
              </span>
              <span className="rounded-full border border-[#dcc9ab] bg-[#fef5e8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b4a2e]">
                {product.review_count} reviews
              </span>
            </div>

            <div className="mt-6">
              <AddToCartButton
                productId={product.id}
                defaultQuantity={1}
                maxQuantity={product.stock_quantity}
                showBuyNow
                variants={product.variants}
              />
            </div>

            <p className="mt-3 text-xs text-[#7a6048]">Secure checkout and order tracking available after purchase.</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-5 shadow-[0_8px_24px_rgba(146,104,56,0.08)] sm:p-6">
          <h2 className="text-brand-display text-3xl uppercase tracking-[0.05em] text-[#3b2513]">Reviews</h2>
          {product.reviews.length === 0 ? (
            <p className="mt-3 text-sm text-[#6f5640]">No approved reviews yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {product.reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4">
                  <p className="text-sm font-semibold text-[#4f341f]">{review.name}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8f673f]">{review.rating} / 5</p>
                  {review.title ? <p className="mt-2 text-sm font-medium text-[#4f341f]">{review.title}</p> : null}
                  <p className="mt-2 text-sm text-[#6f5640]">{review.comment}</p>
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
