import Link from "next/link";
import { notFound } from "next/navigation";

import ImageGallery from "@/components/product/ImageGallery";
import ReviewSubmissionCard from "@/components/reviews/ReviewSubmissionCard";
import { AddToCartButton } from "@/features/cart";
import { fetchProductBySlug } from "@/features/products";
import type { ProductDetail } from "@/lib/api";

export const revalidate = 120;

/* ── Fallback product detail data when backend is unreachable ── */
const FALLBACK_PRODUCTS: Record<string, ProductDetail> = {
  "liquid-chalk": {
    id: -1,
    name: "Liquid Chalk",
    slug: "liquid-chalk",
    description:
      "Premium liquid chalk made with edible-grade Magnesium Carbonate. Strong grip, zero slip — available in 100gm and 200gm bottles. Dries fast, lasts through your entire workout, and keeps your hands clean.",
    price: 15000,
    price_display: "\u20B9150",
    price_original: null,
    price_discounted: null,
    is_discount_active: false,
    discount_percentage: 0,
    in_stock: true,
    is_coming_soon: false,
    stock_quantity: 50,
    available_quantity: 50,
    average_rating: 0,
    review_count: 0,
    primary_image: { id: 0, path: "", url: "/liquid-chalk-dominate200ml.png", thumbnail_url: "/liquid-chalk-dominate200ml.png", is_primary: true, display_order: 0 },
    images: [{ id: 0, path: "", url: "/liquid-chalk-dominate200ml.png", thumbnail_url: "/liquid-chalk-dominate200ml.png", is_primary: true, display_order: 0 }],
    variants: [],
    reviews: [],
  },
  "standard-parallettes": {
    id: -2,
    name: "Standard Parallettes",
    slug: "standard-parallettes",
    description:
      "Premium wooden parallettes for calisthenics training. Handcrafted for dips, L-sits, handstands, and progression work. Stable, durable, and built for real athletes.",
    price: 100000,
    price_display: "\u20B91000",
    price_original: null,
    price_discounted: null,
    is_discount_active: false,
    discount_percentage: 0,
    in_stock: false,
    is_coming_soon: true,
    stock_quantity: 0,
    available_quantity: 0,
    average_rating: 0,
    review_count: 0,
    primary_image: { id: 0, path: "", url: "/dominate-parallettes-standard.png", thumbnail_url: "/dominate-parallettes-standard.png", is_primary: true, display_order: 0 },
    images: [{ id: 0, path: "", url: "/dominate-parallettes-standard.png", thumbnail_url: "/dominate-parallettes-standard.png", is_primary: true, display_order: 0 }],
    variants: [],
    reviews: [],
  },
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`h-[14px] w-[14px] ${i < Math.round(rating) ? "text-[#d4943b]" : "text-[#d9c8ad]"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[11px] text-[#9a7147]">
        {rating > 0 ? `${rating.toFixed(1)}` : "No ratings"} ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-3 w-3 ${i < rating ? "text-[#d4943b]" : "text-[#d9c8ad]"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product: ProductDetail;
  let usingFallback = false;
  try {
    product = await fetchProductBySlug(slug);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      notFound();
    }
    // Backend unreachable — try fallback
    const fallback = FALLBACK_PRODUCTS[slug];
    if (fallback) {
      product = fallback;
      usingFallback = true;
    } else {
      notFound();
    }
  }

  return (
    <div className="min-h-screen bg-[#fff8ec]">
      {/* Breadcrumb */}
      <div className="border-b border-[#d9c8ad]/40 bg-[#fff8ec]">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-5 py-4 text-[11px] text-[#9a7147] sm:px-8 lg:px-10">
          <Link href="/" className="transition-colors hover:text-[#6c5641]">Home</Link>
          <svg className="h-3 w-3 text-[#d9c8ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/products" className="transition-colors hover:text-[#6c5641]">Products</Link>
          <svg className="h-3 w-3 text-[#d9c8ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#302115]">{product.name}</span>
        </div>
      </div>

      {/* Main product section */}
      <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        {usingFallback && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#a67126]/20 bg-[#a67126]/5 p-4">
            <svg className="h-5 w-5 shrink-0 text-[#a67126]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[13px] text-[#6c5641]">
              Showing preview info. Some details may update when the store is fully loaded.
            </p>
          </div>
        )}
        <section className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
          {/* Gallery */}
          <ImageGallery images={product.images} productName={product.name} />

          {/* Product info */}
          <div className="lg:py-2">
            {/* Tag */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="rounded-full border border-[#a67126]/20 bg-[#a67126]/8 px-3 py-[5px] text-[9px] font-bold uppercase tracking-[0.2em] text-[#a67126]">
                DOMINATE Product
              </span>
              {product.is_coming_soon ? (
                <span className="flex items-center gap-1.5 rounded-full border border-[#a67126]/25 bg-[#a67126]/10 px-3 py-[5px] text-[10px] font-semibold uppercase tracking-wider text-[#a67126]">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Coming Soon
                </span>
              ) : product.in_stock ? (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#4a7c3f]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4a7c3f]" />
                  In Stock
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a94442]">Out of Stock</span>
              )}
            </div>

            {/* Name */}
            <h1 className="mt-4 font-display text-[clamp(32px,5vw,52px)] uppercase leading-[0.95] tracking-[0.03em] text-[#302115]">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="mt-3">
              <StarRating rating={product.average_rating} count={product.review_count} />
            </div>

            {/* Description */}
            <p className="mt-5 max-w-[480px] text-[14px] leading-[1.8] text-[#6c5641]">
              {product.description}
            </p>

            {/* Divider */}
            <div className="my-6 h-px bg-[#d9c8ad]/50" />

            {/* Price + Add to cart */}
            {product.is_coming_soon ? (
              <div className="space-y-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[36px] tracking-[0.02em] text-[#302115]">
                    {product.price_display}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#a67126]/20 bg-[#a67126]/5 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#a67126]/10">
                    <svg className="h-6 w-6 text-[#a67126]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="mt-3 font-display text-[20px] uppercase tracking-[0.04em] text-[#302115]">Coming Soon</p>
                  <p className="mt-1 text-[13px] leading-[1.6] text-[#6c5641]">
                    This product is currently in development. Follow us on Instagram for launch updates.
                  </p>
                  <a
                    href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/dominate.cali"}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative mt-4 inline-flex overflow-hidden rounded-full bg-[#1e1710] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14]"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative flex items-center gap-2">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                      Follow for Updates
                    </span>
                  </a>
                </div>
              </div>
            ) : (
                <AddToCartButton
                productId={product.id}
                basePrice={product.price}
                basePriceDisplay={product.price_display}
                originalPrice={product.price_original}
                discountPercentage={product.discount_percentage}
                defaultQuantity={1}
                maxQuantity={product.available_quantity ?? product.stock_quantity}
                showBuyNow
                variants={product.variants}
              />
            )}

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <TrustBadge
                icon="M13 10V3L4 14h7v7l9-11h-7z"
                text="Fast Dispatch"
              />
              <TrustBadge
                icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                text="Secure Checkout"
              />
              <TrustBadge
                icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                text="WhatsApp Support"
              />
            </div>
          </div>
        </section>

        {/* Reviews section */}
        <section className="mt-14 border-t border-[#d9c8ad]/50 pt-10" id="reviews">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Customer Reviews</p>
              <h2 className="mt-2 font-display text-[clamp(28px,4vw,40px)] uppercase tracking-[0.04em] text-[#302115]">
                What Athletes Say
              </h2>
            </div>
            {product.review_count > 0 && (
              <div className="flex items-center gap-3">
                <span className="font-display text-[32px] text-[#302115]">{product.average_rating.toFixed(1)}</span>
                <div>
                  <StarRating rating={product.average_rating} count={product.review_count} />
                  <p className="mt-0.5 text-[11px] text-[#6c5641]">Based on {product.review_count} {product.review_count === 1 ? "review" : "reviews"}</p>
                </div>
              </div>
            )}
          </div>

          {product.reviews.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[#d9c8ad] bg-[#fffefb] py-12 text-center">
              <p className="text-[14px] text-[#6c5641]">No reviews yet. Be the first to share your experience.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {product.reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-6 transition-shadow hover:shadow-[0_4px_16px_rgba(146,104,56,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a67126]/10 text-[11px] font-bold text-[#a67126]">
                        {review.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#302115]">{review.name}</p>
                        {review.is_verified_purchase && (
                          <p className="flex items-center gap-1 text-[10px] text-[#4a7c3f]">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Verified Purchase
                          </p>
                        )}
                      </div>
                    </div>
                    <ReviewStars rating={review.rating} />
                  </div>
                  {review.title && (
                    <p className="mt-3 text-[13px] font-semibold text-[#302115]">{review.title}</p>
                  )}
                  <p className="mt-2 text-[13px] leading-[1.7] text-[#6c5641]">{review.comment}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Review form */}
        <ReviewSubmissionCard slug={product.slug} />
      </div>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9a7147]">
      <svg className="h-4 w-4 text-[#a67126]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      {text}
    </div>
  );
}
