import Link from "next/link";

import AppImage from "@/components/ui/AppImage";
import { fetchProducts } from "@/features/products";

export const revalidate = 120;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = (resolvedSearchParams.q || "").trim();
  const page = Number(resolvedSearchParams.page || "1") || 1;

  let items = [] as Awaited<ReturnType<typeof fetchProducts>>["items"];
  let fetchError: string | null = null;

  try {
    const response = await fetchProducts({
      page,
      perPage: 12,
      q: q || undefined,
    });
    items = response.items;
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Unable to load products";
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#9a7147]">Storefront</p>
            <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.05em] text-[#3b2513] sm:text-5xl">Products</h1>
            <div className="mt-2 flex items-center gap-3 text-xs uppercase tracking-[0.14em]">
              <span className="rounded-full border border-[#d2be9d] bg-[#fff7ea] px-3 py-1 text-[#7e5f42]">
                {items.length} items
              </span>
              <Link href="/cart" className="text-[#8f673f] hover:text-[#6e4d2f]">
                View cart
              </Link>
            </div>
          </div>
          <form className="flex w-full gap-2 sm:w-auto" action="/products" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search products"
              className="w-full rounded-lg border border-[#d2be9d] bg-[#fffaf2] px-3 py-2 text-sm text-[#3b2513] outline-none placeholder:text-[#9a815f] focus:border-[#b69167] sm:w-72"
            />
            <button
              type="submit"
              className="rounded-lg border border-[#9c7349] bg-[#8e653d] px-4 py-2 text-sm font-semibold text-[#fff7ea] hover:bg-[#a3774b]"
            >
              Search
            </button>
          </form>
        </div>

        {fetchError ? (
          <div className="rounded-xl border border-[#cc8a7b] bg-[#fff0eb] p-4 text-sm text-[#8a3f33]">
            Failed to fetch products: {fetchError}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-[#dcc9ab] bg-[#fffefb] p-4 shadow-[0_8px_24px_rgba(146,104,56,0.08)] transition hover:border-[#b69167]"
            >
              <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-[#f5ebdb]">
                {product.primary_image?.thumbnail_url || product.primary_image?.url ? (
                  <AppImage
                    src={product.primary_image.thumbnail_url || product.primary_image.url || ""}
                    alt={product.name}
                    width={800}
                    height={600}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-[#9f8a6b]">
                    No image
                  </div>
                )}
              </div>

              <h2 className="text-lg font-semibold text-[#2f1f12]">{product.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-[#6c5641]">{product.description}</p>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#6f4a2c]">{product.price_display}</span>
                <span className="text-[#90765c]">{product.review_count} reviews</span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="rounded-full border border-[#dcc9ab] bg-[#fef5e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b4a2e]">
                  {product.in_stock ? "In Stock" : "Out of stock"}
                </span>
                <Link
                  href={`/products/${product.slug}`}
                  className="inline-flex rounded-full border border-[#b18a5f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b4a2e] hover:bg-[#f1e0c7]"
                >
                  View Product
                </Link>
              </div>
            </article>
          ))}
        </div>

        {!fetchError && items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[#d9c8ad] bg-[#fff8ec] p-6 text-center">
            <p className="text-base font-semibold text-[#4f341f]">No products found</p>
            <p className="mt-2 text-sm text-[#6f5640]">Try a different keyword or browse the full catalog.</p>
            <Link
              href="/products"
              className="mt-4 inline-flex rounded-full border border-[#b18a5f] px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b4a2e] hover:bg-[#f1e0c7]"
            >
              Reset Search
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
