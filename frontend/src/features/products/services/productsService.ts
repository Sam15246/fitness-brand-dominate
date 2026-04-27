import { serverApiGet } from "@/lib/server-api";
import type { ProductCard, ProductDetail, PaginationMeta } from "@/lib/api";

export type ProductListParams = {
  page?: number;
  perPage?: number;
  q?: string;
};

export async function fetchProducts(params: ProductListParams = {}) {
  const search = new URLSearchParams();
  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.perPage) {
    search.set("per_page", String(params.perPage));
  }
  if (params?.q) {
    search.set("q", params.q);
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const data = await serverApiGet<{
    items: ProductCard[];
  }>(`/products${suffix}`, {
    cache: "force-cache",
    revalidate: 120,
    includeAuthCookie: false,
  });

  return {
    items: data.items,
    pagination: undefined as PaginationMeta | undefined,
  };
}

export async function fetchProductBySlug(slug: string): Promise<ProductDetail> {
  const data = await serverApiGet<{ product: ProductDetail }>(`/products/${encodeURIComponent(slug)}`, {
    cache: "force-cache",
    revalidate: 120,
    includeAuthCookie: false,
  });
  return data.product;
}
