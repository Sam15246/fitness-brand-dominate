import { getProductBySlug, getProducts, type ProductDetail } from "@/lib/api";

export type ProductListParams = {
  page?: number;
  perPage?: number;
  q?: string;
};

export async function fetchProducts(params: ProductListParams = {}) {
  return getProducts(params);
}

export async function fetchProductBySlug(slug: string): Promise<ProductDetail> {
  return getProductBySlug(slug);
}
