import Link from "next/link";

import AppImage from "@/components/ui/AppImage";
import { fetchProducts } from "@/features/products";
import type { ProductCard } from "@/lib/api";

export const revalidate = 120;

const FALLBACK_PRODUCTS: ProductCard[] = [
  {
    id: -1,
    name: "Liquid Chalk",
    slug: "liquid-chalk",
    description: "Premium liquid chalk made with edible-grade Magnesium Carbonate. Strong grip, zero slip — available in 100gm and 200gm bottles.",
    price: 15000,
    price_display: "\u20B9150",
    price_original: null,
    price_discounted: null,
    is_discount_active: false,
    discount_percentage: 0,
    in_stock: true,
    is_coming_soon: false,
    stock_quantity: 50,
    average_rating: 0,
    review_count: 0,
    primary_image: { id: 0, path: "", url: "/liquid-chalk-dominate200ml.png", thumbnail_url: "/liquid-chalk-dominate200ml.png", is_primary: true, display_order: 0 },
  },
  {
    id: -2,
    name: "Standard Parallettes",
    slug: "standard-parallettes",
    description: "Premium wooden parallettes for calisthenics training. Handcrafted for dips, L-sits, and progression work.",
    price: 100000,
    price_display: "\u20B91000",
    price_original: null,
    price_discounted: null,
    is_discount_active: false,
    discount_percentage: 0,
    in_stock: false,
    is_coming_soon: true,
    stock_quantity: 0,
    average_rating: 0,
    review_count: 0,
    primary_image: { id: 0, path: "", url: "/dominate-parallettes-standard.png", thumbnail_url: "/dominate-parallettes-standard.png", is_primary: true, display_order: 0 },
  },
];

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-[2px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`h-3 w-3 ${i < Math.round(rating) ? "text-[#d4943b]" : "text-[#d9c8ad]"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[10px] text-[#9a7147]">({count})</span>
    </div>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = (resolvedSearchParams.q || "").trim();
  const page = Number(resolvedSearchParams.page || "1") || 1;

  let items: ProductCard[] = [];
  let usingFallback = false;

  try {
    const response = await fetchProducts({
      page,
      perPage: 12,
      q: q || undefined,
    });
    items = response.items;
  } catch {
    // Backend unreachable — show fallback products
    items = q
      ? FALLBACK_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
      : FALLBACK_PRODUCTS;
    usingFallback = true;
  }

  return (
    <div className="min-h-screen bg-[#fff8ec]">
      {/* Hero header */}
      <div className="border-b border-[#d9c8ad]/60 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#f5e7d2_0%,#fff8ec_70%)]">
        <div className="mx-auto max-w-[1240px] px-5 pb-8 pt-10 sm:px-8 lg:px-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">The Collection</p>
          <h1 className="mt-2 font-display text-[clamp(36px,7vw,56px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            Our Products
          </h1>
          <p className="mt-3 max-w-[420px] text-[13px] leading-[1.75] text-[#6c5641]">
            Premium grip tools and bodyweight equipment — built for real training.
          </p>

          {/* Search + count */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <form className="flex gap-2" action="/products" method="get">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a67126]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Search products..."
                  className="w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] py-2.5 pl-10 pr-4 text-sm text-[#3b2513] outline-none transition-colors placeholder:text-[#b5a08a] focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)] sm:w-72"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[#1e1710] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#f4eee4] transition-colors hover:bg-[#2b1e14]"
              >
                Search
              </button>
            </form>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a7147]">
              <span>{items.length} {items.length === 1 ? "product" : "products"}</span>
              {q && (
                <Link href="/products" className="rounded-full border border-[#d9c8ad] px-3 py-1 transition-colors hover:bg-[#f5e7d2]">
                  Clear search
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 lg:px-10">
        {usingFallback && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#a67126]/20 bg-[#a67126]/5 p-5">
            <svg className="h-5 w-5 shrink-0 text-[#a67126]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[13px] text-[#6c5641]">
              Showing preview catalog. Some details may update when the store is fully loaded.
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#d9c8ad] bg-[#fffefb] shadow-[0_4px_16px_rgba(146,104,56,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#c4a87a] hover:shadow-[0_16px_48px_rgba(146,104,56,0.12)]"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-[#f5ebdb]">
                {product.primary_image?.thumbnail_url || product.primary_image?.url ? (
                  <AppImage
                    src={product.primary_image.thumbnail_url || product.primary_image.url || ""}
                    alt={product.name}
                    width={800}
                    height={600}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-[#b5a08a]">
                    No image
                  </div>
                )}

                {/* Badges overlay */}
                <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                  {product.is_coming_soon && (
                    <span className="flex items-center gap-1 rounded-full bg-[#a67126] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#f4eee4]">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Coming Soon
                    </span>
                  )}
                  {!product.is_coming_soon && !product.in_stock && (
                    <span className="rounded-full bg-[#302115]/80 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#f4eee4] backdrop-blur-sm">
                      Sold Out
                    </span>
                  )}
                  {product.discount_percentage > 0 && (
                    <span className="rounded-full bg-[#a67126] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#f4eee4]">
                      {product.discount_percentage}% Off
                    </span>
                  )}
                </div>

                {/* Quick view overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#1e1710]/0 transition-colors duration-300 group-hover:bg-[#1e1710]/15">
                  <span className="translate-y-3 rounded-full bg-[#f4eee4] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#302115] opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    View Product
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-[15px] font-semibold text-[#302115] transition-colors group-hover:text-[#a67126]">
                  {product.name}
                </h2>
                <p className="mt-1.5 line-clamp-2 flex-1 text-[12px] leading-[1.7] text-[#6c5641]">
                  {product.description}
                </p>

                {/* Rating */}
                <div className="mt-3">
                  <StarRating rating={product.average_rating} count={product.review_count} />
                </div>

                {/* Price + CTA */}
                <div className="mt-4 flex items-center justify-between border-t border-[#d9c8ad]/50 pt-4">
                  <div>
                    <span className="font-display text-[22px] tracking-[0.02em] text-[#302115]">
                      {product.price_display}
                    </span>
                    {product.price_original && product.is_discount_active && (
                      <span className="ml-2 text-[11px] text-[#9a7147] line-through">
                        Rs. {(product.price_original / 100).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9c8ad] text-[#a67126] transition-all duration-200 group-hover:border-[#a67126] group-hover:bg-[#a67126] group-hover:text-[#f4eee4]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d9c8ad] bg-[#fffefb] py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5e7d2]">
              <svg className="h-7 w-7 text-[#a67126]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="mt-5 font-display text-[24px] uppercase tracking-[0.04em] text-[#302115]">No Products Found</p>
            <p className="mt-2 text-[13px] text-[#6c5641]">Try a different keyword or browse the full catalog.</p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-full bg-[#1e1710] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#f4eee4] transition-colors hover:bg-[#2b1e14]"
            >
              View All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
