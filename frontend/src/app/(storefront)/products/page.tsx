import Link from "next/link";

import AppImage from "@/components/ui/AppImage";
import { fetchProducts } from "@/features/products";

export const dynamic = "force-dynamic";

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
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#b59a73]">Storefront</p>
            <h1 className="text-brand-display mt-2 text-5xl uppercase tracking-[0.05em]">Products</h1>
            <div className="mt-2">
              <Link href="/cart" className="text-xs uppercase tracking-[0.18em] text-[#b59a73] hover:text-[#d8c19a]">
                View cart
              </Link>
            </div>
          </div>
          <form className="flex gap-2" action="/products" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search products"
              className="rounded-lg border border-[#8b6f47]/50 bg-[#171411] px-3 py-2 text-sm text-[#f2e7d4] outline-none focus:border-[#b59a73]"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#8b6f47] px-4 py-2 text-sm font-semibold text-[#1a130d] hover:bg-[#a1845d]"
            >
              Search
            </button>
          </form>
        </div>

        {fetchError ? (
          <div className="rounded-xl border border-[#a94442]/40 bg-[#2b1414]/70 p-4 text-sm text-[#f6c5c5]">
            Failed to fetch products: {fetchError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <article
              key={product.id}
              className="rounded-xl border border-[#8b6f47]/30 bg-[#15120f]/90 p-4 transition hover:border-[#b59a73]/60"
            >
              <div className="mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-[#211a14]">
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

              <h2 className="text-lg font-semibold text-[#f4eee4]">{product.name}</h2>
              <p className="mt-1 text-sm text-[#ccbca1]">{product.description}</p>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#f0d4a7]">{product.price_display}</span>
                <span className="text-[#b8a481]">{product.review_count} reviews</span>
              </div>

              <div className="mt-4">
                <Link
                  href={`/products/${product.slug}`}
                  className="inline-flex rounded-full border border-[#9f8157] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f2e7d4] hover:bg-[#8b6f47] hover:text-[#17110c]"
                >
                  View Product
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
