import { z } from "zod";

import {
  productDetailResponseSchema,
  productsListResponseSchema,
} from "@/lib/api-schemas";

export type ApiMeta = {
  timestamp?: string;
  [key: string]: unknown;
};

export type ApiError = {
  message: string;
  code?: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: ApiError | null;
  meta?: ApiMeta;
};

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  auth_provider: string;
  avatar_url: string | null;
  full_name: string | null;
  is_affiliate: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductImage = {
  id: number;
  path: string;
  url: string | null;
  thumbnail_url: string | null;
  is_primary: boolean;
  display_order: number;
  variant_ids?: number[];  // Optional for backward compatibility with API
};

export type ProductVariant = {
  id: number;
  sku: string;
  option_values: Record<string, string>;
  price_override: number | null;
  price_original?: number | null;
  price_discounted?: number | null;
  is_discount_active?: boolean;
  effective_price: number;
  effective_original_price?: number;
  stock_quantity: number;
  available_quantity?: number;
  weight_grams: number | null;
  is_active: boolean;
};

export type ProductCard = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  price_display: string;
  listing_price_display?: string;
  price_original: number | null;
  price_discounted: number | null;
  is_discount_active: boolean;
  discount_percentage: number;
  in_stock: boolean;
  is_coming_soon: boolean;
  stock_quantity: number;
  available_quantity?: number;
  average_rating: number;
  review_count: number;
  primary_image: ProductImage | null;
};

export type ProductReview = {
  id: number;
  name: string;
  role: string | null;
  rating: number;
  title: string | null;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string | null;
};

export type ProductDetail = ProductCard & {
  images: ProductImage[];
  variants: ProductVariant[];
  reviews: ProductReview[];
};

export type CartLineItem = {
  product_id: number;
  variant_id: number | null;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  unit_price_display: string;
  subtotal: number;
  subtotal_display: string;
  product: ProductCard;
};

export type CartData = {
  items: CartLineItem[];
  count: number;
  total: number;
  total_display: string;
};

export type CheckoutPreview = {
  cart: CartData;
  coupon: {
    code: string;
    discount_display: string;
  } | null;
  discount: number;
  discount_display: string;
  payable_total: number;
  payable_total_display: string;
};

export type PlaceOrderPayload = {
  customer_name: string;
  phone_number: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  coupon_code?: string;
  address_id?: number;
  save_address?: boolean;
  set_default_address?: boolean;
  address_label?: string;
  email_opt_in?: boolean;
};

export type PlaceOrderResponse = {
  order: {
    id: number;
    order_number: string;
    status: string;
  };
  redirect_url: string;
  whatsapp_url: string;
};

export type OrderLineSummary = {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string | null;
  variant_id?: number | null;
  variant_label?: string | null;
  quantity: number;
  unit_price: number;
  unit_price_display: string;
  subtotal: number;
  subtotal_display: string;
};

export type OrderSummary = {
  id: number;
  order_number: string;
  status: string;
  shipping_status: string;
  tracking_number?: string | null;
  courier_name?: string | null;
  created_at: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  total_price: number;
  total_price_display: string;
  items: OrderLineSummary[];
};

export type OrdersReviewState = {
  reviewable_order_item_ids: number[];
  reviewed_order_item_ids: number[];
};

export type PaginationMeta = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email_marketing_opt_in: boolean;
  created_at: string | null;
};

export type UserAddress = {
  id: number;
  label: string;
  full_name: string;
  phone: string;
  street_line1: string;
  street_line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string | null;
};

export type PolicyPageContent = {
  id: number;
  slug: string;
  title: string;
  content: string;
  updated_at: string | null;
};

export type ContactInfo = {
  whatsapp_number: string;
  brand_name: string;
  tagline: string;
};

export type ReviewEligibleOrderItem = {
  order_item_id: number;
  order_number: string;
  product_name: string;
  quantity: number;
  delivered_at: string | null;
};

export type ReviewEligibility = {
  has_delivered_purchase: boolean;
  can_submit_review: boolean;
  has_pending_review: boolean;
  has_approved_review: boolean;
  eligible_order_items: ReviewEligibleOrderItem[];
};

export type AdminDashboardStats = {
  total_products: number;
  active_products: number;
  total_orders: number;
  pending_orders: number;
  total_users: number;
};

export type AdminDashboardData = {
  stats: AdminDashboardStats;
  recent_orders: OrderSummary[];
};

export type AdminProduct = ProductCard & {
  sku: string | null;
  weight_grams: number;
  dimensions: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  has_affiliate_profile?: boolean;
  created_at: string | null;
};

export type AdminReview = {
  id: number;
  product_id: number;
  product_name: string | null;
  name: string;
  rating: number;
  title: string | null;
  comment: string;
  is_approved: boolean;
  created_at: string | null;
};

export type AdminCoupon = {
  id: number;
  code: string;
  coupon_type: string;
  discount_display: string;
  is_active: boolean;
  current_uses: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string | null;
};

export type AdminAffiliate = {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  affiliate_code: string;
  commission_percent: number;
  wallet_balance: number;
  wallet_balance_display: string;
  total_earned: number;
  total_earned_display: string;
  is_active: boolean;
  tier: string;
  created_at: string | null;
};

export type AdminCommission = {
  order_id: number;
  order_number: string;
  affiliate_id: number;
  affiliate_name: string | null;
  commission_amount: number;
  commission_amount_display: string;
  commission_status: string;
  status: string;
  created_at: string | null;
};

export type AdminCouponStats = {
  coupon: AdminCoupon;
  summary: {
    total_orders: number;
    current_uses: number;
    max_uses: number | null;
  };
  recent_orders: OrderSummary[];
};

export type AffiliateDashboardData = {
  profile: AdminAffiliate;
  stats: {
    total_orders: number;
    pending_commissions: number;
    approved_commissions: number;
    total_redeemed: number;
    total_redeemed_display: string;
  };
  recent_orders: OrderSummary[];
};

const API_BASE_URL = (() => {
  const publicUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
  // Server-side fetches need an absolute URL — relative paths have no host in Node.js.
  // Use BACKEND_BASE_URL (set in .env) to build the full URL for SSR.
  if (typeof window === "undefined" && publicUrl.startsWith("/")) {
    const backend = (process.env.BACKEND_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
    return `${backend}${publicUrl}`;
  }
  return publicUrl;
})();
const DEFAULT_TIMEOUT = 30_000; // 30 seconds

function validateData<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    if (process.env.NODE_ENV === "development") {
      console.warn(`[API] Validation failed for ${context}:`, issues);
    }
    throw new Error(`Invalid API response for ${context}`);
  }
  return parsed.data;
}

async function parseApiResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  let payload: ApiEnvelope<T>;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("API returned a non-JSON response");
  }

  if (!response.ok || !payload.success) {
    const message = payload.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    signal: init?.signal || AbortSignal.timeout(DEFAULT_TIMEOUT),
    ...init,
  });

  return parseApiResponse<T>(response);
}

export async function apiPost<T>(
  path: string,
  body?: Record<string, unknown>,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: init?.signal || AbortSignal.timeout(DEFAULT_TIMEOUT),
    ...init,
  });

  return parseApiResponse<T>(response);
}

export async function apiPostForm<T>(
  path: string,
  formData: FormData,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    body: formData,
    signal: init?.signal || AbortSignal.timeout(DEFAULT_TIMEOUT),
    ...init,
  });

  return parseApiResponse<T>(response);
}

export async function apiPut<T>(
  path: string,
  body?: Record<string, unknown>,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: init?.signal || AbortSignal.timeout(DEFAULT_TIMEOUT),
    ...init,
  });

  return parseApiResponse<T>(response);
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    signal: init?.signal || AbortSignal.timeout(DEFAULT_TIMEOUT),
    ...init,
  });

  return parseApiResponse<T>(response);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await apiGet<{ user: CurrentUser }>("/auth/me");
  return response.data.user;
}

export async function getApiHealth(): Promise<{ service: string; version: string; status: string }> {
  const response = await apiGet<{ service: string; version: string; status: string }>("/health");
  return response.data;
}

export async function login(payload: { email: string; password: string; remember?: boolean }): Promise<CurrentUser> {
  const response = await apiPost<{ user: CurrentUser }>("/auth/login", payload);
  return response.data.user;
}

export async function loginWithGoogle(payload: { credential: string }): Promise<CurrentUser> {
  const response = await apiPost<{ user: CurrentUser }>("/auth/google", payload);
  return response.data.user;
}

export async function logout(): Promise<void> {
  await apiPost<{ logged_out: boolean }>("/auth/logout");
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<CurrentUser> {
  const response = await apiPost<{ user: CurrentUser }>("/auth/register", payload);
  return response.data.user;
}

export async function forgotPassword(email: string): Promise<string> {
  const response = await apiPost<{ message: string }>("/auth/forgot-password", { email });
  return response.data.message;
}

export async function resetPassword(payload: {
  token: string;
  password: string;
  confirm_password: string;
}): Promise<string> {
  const response = await apiPost<{ message: string }>("/auth/reset-password", payload);
  return response.data.message;
}

export async function getProducts(params?: { page?: number; perPage?: number; q?: string }): Promise<{
  items: ProductCard[];
  pagination?: PaginationMeta;
}> {
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
  const response = await apiGet<{ items: ProductCard[] }>(`/products${suffix}`);
  const validated = validateData(productsListResponseSchema, response.data, "products list");

  return {
    items: validated.items,
    pagination: response.meta?.pagination as PaginationMeta | undefined,
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const response = await apiGet<{ product: ProductDetail }>(`/products/${encodeURIComponent(slug)}`);
  const validated = validateData(productDetailResponseSchema, response.data, "product detail by slug");
  return validated.product;
}

export async function getProductById(productId: number): Promise<ProductDetail> {
  const response = await apiGet<{ product: ProductDetail }>(`/products/id/${productId}`);
  const validated = validateData(productDetailResponseSchema, response.data, "product detail by id");
  return validated.product;
}

export async function getReviewEligibility(slug: string): Promise<ReviewEligibility> {
  const response = await apiGet<{ eligibility: ReviewEligibility }>(`/products/${encodeURIComponent(slug)}/review-eligibility`);
  return response.data.eligibility;
}

export async function submitProductReview(
  slug: string,
  payload: { order_item_id?: number; rating: number; title?: string; comment: string },
): Promise<string> {
  const response = await apiPost<{ message: string }>(`/products/${encodeURIComponent(slug)}/reviews`, payload);
  return response.data.message;
}

export async function getCart(): Promise<CartData> {
  const response = await apiGet<{ cart: CartData }>("/cart");
  return response.data.cart;
}

export async function addToCart(payload: { product_id: number; variant_id?: number; quantity?: number }): Promise<CartData> {
  const response = await apiPost<{ cart: CartData }>("/cart/add", payload);
  return response.data.cart;
}

export async function updateCartItem(productId: number, quantity: number): Promise<CartData> {
  const response = await apiPut<{ cart: CartData }>(`/cart/items/${productId}`, { quantity });
  return response.data.cart;
}

export async function removeCartItem(productId: number): Promise<CartData> {
  const response = await apiDelete<{ cart: CartData }>(`/cart/items/${productId}`);
  return response.data.cart;
}

export async function clearCart(): Promise<CartData> {
  const response = await apiPost<{ cart: CartData }>("/cart/clear");
  return response.data.cart;
}

export async function getCheckoutPreview(couponCode?: string): Promise<CheckoutPreview> {
  const query = couponCode ? `?coupon_code=${encodeURIComponent(couponCode)}` : "";
  const response = await apiGet<CheckoutPreview>(`/checkout/preview${query}`);
  return response.data;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<PlaceOrderResponse> {
  const response = await apiPost<PlaceOrderResponse>("/checkout/place", payload);
  return response.data;
}

export async function lookupOrder(orderNumber: string, email: string): Promise<OrderSummary> {
  const response = await apiPost<{ order: OrderSummary }>("/orders/lookup", {
    order_number: orderNumber,
    email,
  });
  return response.data.order;
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderSummary> {
  const response = await apiGet<{ order: OrderSummary }>(`/orders/${encodeURIComponent(orderNumber)}`);
  return response.data.order;
}

export async function listUserOrders(page: number = 1, perPage: number = 10): Promise<{
  orders: OrderSummary[];
  review_state: OrdersReviewState;
  pagination: { current_page: number; per_page: number; total_items: number; total_pages: number };
}> {
  type PaginationResponse = {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
  
  const response = await apiGet<{
    orders: OrderSummary[];
    reviewable_order_item_ids?: number[];
    reviewed_order_item_ids?: number[];
  }>(`/orders?page=${page}&per_page=${perPage}`);
  const paginationMeta = response.meta?.pagination as PaginationResponse | undefined;
  return {
    orders: response.data.orders,
    review_state: {
      reviewable_order_item_ids: response.data.reviewable_order_item_ids || [],
      reviewed_order_item_ids: response.data.reviewed_order_item_ids || [],
    },
    pagination: {
      current_page: paginationMeta?.current_page || page,
      per_page: paginationMeta?.per_page || perPage,
      total_items: paginationMeta?.total_items || 0,
      total_pages: paginationMeta?.total_pages || 0,
    }
  };
}

// User Profile API Methods

export async function getUserProfile(): Promise<UserProfile> {
  const response = await apiGet<{ user: UserProfile }>("/users/profile");
  return response.data.user;
}

export async function updateUserProfile(payload: {
  name?: string;
  phone?: string;
  full_name?: string;
  email_marketing_opt_in?: boolean;
}): Promise<UserProfile> {
  const response = await apiPut<{ user: UserProfile }>("/users/profile", payload);
  return response.data.user;
}

// User Addresses API Methods

export async function getUserAddresses(): Promise<UserAddress[]> {
  const response = await apiGet<{ addresses: UserAddress[] }>("/users/addresses");
  return response.data.addresses;
}

export async function createUserAddress(payload: {
  label: string;
  full_name: string;
  phone: string;
  street_line1: string;
  street_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}): Promise<UserAddress> {
  const response = await apiPost<{ address: UserAddress }>("/users/addresses", payload);
  return response.data.address;
}

export async function updateUserAddress(
  addressId: number,
  payload: {
    label?: string;
    full_name?: string;
    phone?: string;
    street_line1?: string;
    street_line2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }
): Promise<UserAddress> {
  const response = await apiPut<{ address: UserAddress }>(`/users/addresses/${addressId}`, payload);
  return response.data.address;
}

export async function deleteUserAddress(addressId: number): Promise<void> {
  await apiDelete(`/users/addresses/${addressId}`);
}

export async function setDefaultAddress(addressId: number): Promise<UserAddress> {
  const response = await apiPut<{ address: UserAddress }>(`/users/addresses/${addressId}/default`, {});
  return response.data.address;
}

export async function getPolicyPage(slug: "shipping" | "returns" | "terms" | "privacy"): Promise<PolicyPageContent> {
  const response = await apiGet<{ policy: PolicyPageContent }>(`/content/policies/${slug}`);
  return response.data.policy;
}

export async function getContactInfo(): Promise<ContactInfo> {
  const response = await apiGet<ContactInfo>("/content/contact");
  return response.data;
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const response = await apiGet<AdminDashboardData>("/admin/dashboard");
  return response.data;
}

export async function listAdminOrders(
  page: number = 1,
  perPage: number = 20,
  status: string = "all",
  q: string = "",
): Promise<{
  orders: OrderSummary[];
  pagination: { current_page: number; per_page: number; total_items: number; total_pages: number };
}> {
  type PaginationResponse = {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };

  const search = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status,
  });
  if (q.trim()) {
    search.set("q", q.trim());
  }

  const response = await apiGet<{ orders: OrderSummary[] }>(`/admin/orders?${search.toString()}`);
  const paginationMeta = response.meta?.pagination as PaginationResponse | undefined;

  return {
    orders: response.data.orders,
    pagination: {
      current_page: paginationMeta?.current_page || page,
      per_page: paginationMeta?.per_page || perPage,
      total_items: paginationMeta?.total_items || 0,
      total_pages: paginationMeta?.total_pages || 0,
    },
  };
}

export async function getAdminOrder(orderId: number): Promise<OrderSummary> {
  const response = await apiGet<{ order: OrderSummary }>(`/admin/orders/${orderId}`);
  return response.data.order;
}

export async function updateAdminOrderStatus(orderId: number, status: string): Promise<OrderSummary> {
  const response = await apiPut<{ order: OrderSummary }>(`/admin/orders/${orderId}/status`, { status });
  return response.data.order;
}

export async function updateAdminOrderShipping(
  orderId: number,
  payload: { shipping_status: string; tracking_number?: string; courier_name?: string },
): Promise<OrderSummary> {
  const response = await apiPut<{ order: OrderSummary }>(`/admin/orders/${orderId}/shipping`, payload);
  return response.data.order;
}

export async function confirmAdminOrder(orderId: number): Promise<OrderSummary> {
  const response = await apiPost<{ order: OrderSummary }>(`/admin/orders/${orderId}/confirm`, {});
  return response.data.order;
}

export async function cancelAdminOrder(orderId: number, reason?: string): Promise<OrderSummary> {
  const response = await apiPost<{ order: OrderSummary }>(`/admin/orders/${orderId}/cancel`, {
    reason,
  });
  return response.data.order;
}

export type AdminOrderItemInput = {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit_price?: number | null;
};

export type AdminOrderCreatePayload = {
  customer_name: string;
  phone_number: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  confirm_now?: boolean;
  items: AdminOrderItemInput[];
};

export async function createAdminOrder(payload: AdminOrderCreatePayload): Promise<OrderSummary> {
  const response = await apiPost<{ order: OrderSummary }>("/admin/orders", payload);
  return response.data.order;
}

export async function listAdminProducts(
  page: number = 1,
  perPage: number = 20,
  status: string = "all",
  sort: string = "latest",
  q: string = "",
): Promise<{
  items: AdminProduct[];
  pagination: { current_page: number; per_page: number; total_items: number; total_pages: number };
}> {
  type PaginationResponse = {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };

  const search = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status,
    sort,
  });
  if (q.trim()) {
    search.set("q", q.trim());
  }

  const response = await apiGet<{ items: AdminProduct[] }>(`/admin/products?${search.toString()}`);
  const paginationMeta = response.meta?.pagination as PaginationResponse | undefined;

  return {
    items: response.data.items,
    pagination: {
      current_page: paginationMeta?.current_page || page,
      per_page: paginationMeta?.per_page || perPage,
      total_items: paginationMeta?.total_items || 0,
      total_pages: paginationMeta?.total_pages || 0,
    },
  };
}

export async function getAdminProduct(productId: number): Promise<AdminProduct> {
  const response = await apiGet<{ product: AdminProduct }>(`/admin/products/${productId}`);
  return response.data.product;
}

export async function updateAdminProduct(
  productId: number,
  payload: {
    name?: string;
    description?: string;
    price?: number;
    price_original?: number | null;
    price_discounted?: number | null;
    is_discount_active?: boolean;
    stock_quantity?: number;
    weight_grams?: number;
    dimensions?: string;
    image_url?: string;
    is_active?: boolean;
  },
): Promise<AdminProduct> {
  const response = await apiPut<{ product: AdminProduct }>(`/admin/products/${productId}`, payload);
  return response.data.product;
}

export async function archiveAdminProduct(productId: number): Promise<AdminProduct> {
  const response = await apiDelete<{ product: AdminProduct }>(`/admin/products/${productId}`);
  return response.data.product;
}

export async function hardDeleteAdminProduct(productId: number): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`/admin/products/${productId}/hard-delete`);
}

export async function createAdminProduct(payload: {
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  weight_grams: number;
  dimensions?: string;
  image_url?: string;
  is_active?: boolean;
}): Promise<AdminProduct> {
  const response = await apiPost<{ product: AdminProduct }>("/admin/products", payload);
  return response.data.product;
}

export async function getAdminProductImages(productId: number): Promise<ProductImage[]> {
  const response = await apiGet<{ items: ProductImage[] }>(`/admin/products/${productId}/images`);
  return response.data.items;
}

export async function createAdminProductImage(
  productId: number,
  payload: {
    image_path: string;
    storage_path?: string;
    display_order?: number;
    is_primary?: boolean;
    variant_ids?: number[];  // NEW: Array of variant IDs to link image to
  },
): Promise<ProductImage> {
  const response = await apiPost<{ image: ProductImage }>(`/admin/products/${productId}/images`, payload);
  return response.data.image;
}

export async function uploadAdminProductImage(
  productId: number,
  payload: {
    file: File;
    display_order?: number;
    is_primary?: boolean;
    variant_ids?: number[];  // NEW: Array of variant IDs to link image to
  },
): Promise<ProductImage> {
  const formData = new FormData();
  formData.set("file", payload.file);
  if (typeof payload.display_order === "number") {
    formData.set("display_order", String(payload.display_order));
  }
  if (typeof payload.is_primary === "boolean") {
    formData.set("is_primary", payload.is_primary ? "true" : "false");
  }
  if (Array.isArray(payload.variant_ids) && payload.variant_ids.length > 0) {  // NEW
    formData.set("variant_ids", JSON.stringify(payload.variant_ids));
  }

  const response = await apiPostForm<{ image: ProductImage }>(`/admin/products/${productId}/images`, formData);
  return response.data.image;
}

export async function updateAdminProductImage(
  productId: number,
  imageId: number,
  payload: {
    image_path?: string;
    storage_path?: string;
    display_order?: number;
    is_primary?: boolean;
    variant_ids?: number[];  // NEW: Array of variant IDs to link image to
  },
): Promise<ProductImage> {
  const response = await apiPut<{ image: ProductImage }>(`/admin/products/${productId}/images/${imageId}`, payload);
  return response.data.image;
}

export async function deleteAdminProductImage(productId: number, imageId: number): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`/admin/products/${productId}/images/${imageId}`);
}

// ── Admin Variant Management ──

export type AdminVariant = {
  id: number;
  product_id: number;
  sku: string;
  option_values: Record<string, string>;
  price_override: number | null;
  price_original: number | null;  // NEW: MRP for variant
  price_discounted: number | null;  // NEW: Discounted price for variant
  is_discount_active: boolean;  // NEW: Discount toggle
  effective_price: number;
  effective_original_price: number;  // NEW: Original price with fallback
  stock_quantity: number;
  weight_grams: number | null;
  is_active: boolean;
  created_at: string | null;
};

export async function listAdminVariants(productId: number): Promise<AdminVariant[]> {
  const response = await apiGet<{ variants: AdminVariant[] }>(`/admin/products/${productId}/variants`);
  return response.data.variants;
}

export async function createAdminVariant(
  productId: number,
  payload: {
    sku: string;
    option_values: Record<string, string>;
    price_override: number | null;
    price_original?: number | null;  // NEW
    price_discounted?: number | null;  // NEW
    is_discount_active?: boolean;  // NEW
    stock_quantity: number;
    is_active?: boolean;
  },
): Promise<AdminVariant> {
  const response = await apiPost<{ variant: AdminVariant }>(`/admin/products/${productId}/variants`, payload);
  return response.data.variant;
}

export async function updateAdminVariant(
  productId: number,
  variantId: number,
  payload: Partial<{
    sku: string;
    option_values: Record<string, string>;
    price_override: number | null;
    price_original: number | null;  // NEW
    price_discounted: number | null;  // NEW
    is_discount_active: boolean;  // NEW
    stock_quantity: number;
    is_active: boolean;
  }>,
): Promise<AdminVariant> {
  const response = await apiPut<{ variant: AdminVariant }>(`/admin/products/${productId}/variants/${variantId}`, payload);
  return response.data.variant;
}

export async function deleteAdminVariant(productId: number, variantId: number): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`/admin/products/${productId}/variants/${variantId}`);
}

export async function listAdminUsers(
  page: number = 1,
  perPage: number = 20,
  role: string = "all",
  q: string = "",
): Promise<{
  items: AdminUser[];
  pagination: { current_page: number; per_page: number; total_items: number; total_pages: number };
}> {
  type PaginationResponse = {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };

  const search = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    role,
  });
  if (q.trim()) {
    search.set("q", q.trim());
  }

  const response = await apiGet<{ items: AdminUser[] }>(`/admin/users?${search.toString()}`);
  const paginationMeta = response.meta?.pagination as PaginationResponse | undefined;

  return {
    items: response.data.items,
    pagination: {
      current_page: paginationMeta?.current_page || page,
      per_page: paginationMeta?.per_page || perPage,
      total_items: paginationMeta?.total_items || 0,
      total_pages: paginationMeta?.total_pages || 0,
    },
  };
}

export async function updateAdminUser(
  userId: number,
  payload: { role?: string; is_active?: boolean },
): Promise<AdminUser> {
  const response = await apiPut<{ user: AdminUser }>(`/admin/users/${userId}`, payload);
  return response.data.user;
}

export async function deleteAdminUser(userId: number): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`/admin/users/${userId}`);
}

export async function listAdminReviews(
  page: number = 1,
  perPage: number = 20,
  status: string = "all",
  q: string = "",
): Promise<{
  items: AdminReview[];
  pagination: { current_page: number; per_page: number; total_items: number; total_pages: number };
}> {
  type PaginationResponse = {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };

  const search = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status,
  });
  if (q.trim()) {
    search.set("q", q.trim());
  }

  const response = await apiGet<{ items: AdminReview[] }>(`/admin/reviews?${search.toString()}`);
  const paginationMeta = response.meta?.pagination as PaginationResponse | undefined;

  return {
    items: response.data.items,
    pagination: {
      current_page: paginationMeta?.current_page || page,
      per_page: paginationMeta?.per_page || perPage,
      total_items: paginationMeta?.total_items || 0,
      total_pages: paginationMeta?.total_pages || 0,
    },
  };
}

export async function listAdminPolicies(): Promise<PolicyPageContent[]> {
  const response = await apiGet<{ items: PolicyPageContent[] }>("/admin/policies");
  return response.data.items;
}

export async function listAdminCoupons(
  page: number = 1,
  perPage: number = 20,
  type: string = "all",
  status: string = "all",
  q: string = "",
): Promise<{
  items: AdminCoupon[];
  pagination: { current_page: number; per_page: number; total_items: number; total_pages: number };
}> {
  type PaginationResponse = {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };

  const search = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    type,
    status,
  });
  if (q.trim()) {
    search.set("q", q.trim());
  }

  const response = await apiGet<{ items: AdminCoupon[] }>(`/admin/coupons?${search.toString()}`);
  const paginationMeta = response.meta?.pagination as PaginationResponse | undefined;

  return {
    items: response.data.items,
    pagination: {
      current_page: paginationMeta?.current_page || page,
      per_page: paginationMeta?.per_page || perPage,
      total_items: paginationMeta?.total_items || 0,
      total_pages: paginationMeta?.total_pages || 0,
    },
  };
}

export async function listAdminAffiliates(
  page: number = 1,
  perPage: number = 20,
  q: string = "",
): Promise<{
  items: AdminAffiliate[];
  pagination: { current_page: number; per_page: number; total_items: number; total_pages: number };
}> {
  type PaginationResponse = {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };

  const search = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (q.trim()) {
    search.set("q", q.trim());
  }

  const response = await apiGet<{ items: AdminAffiliate[] }>(`/admin/affiliates?${search.toString()}`);
  const paginationMeta = response.meta?.pagination as PaginationResponse | undefined;

  return {
    items: response.data.items,
    pagination: {
      current_page: paginationMeta?.current_page || page,
      per_page: paginationMeta?.per_page || perPage,
      total_items: paginationMeta?.total_items || 0,
      total_pages: paginationMeta?.total_pages || 0,
    },
  };
}

export async function updateAdminAffiliate(
  affiliateId: number,
  payload: { is_active: boolean },
): Promise<AdminAffiliate> {
  const response = await apiPut<{ affiliate: AdminAffiliate }>(`/admin/affiliates/${affiliateId}`, payload);
  return response.data.affiliate;
}

export async function adjustAdminAffiliateWallet(
  affiliateId: number,
  payload: { amount: number; reason?: string },
): Promise<AdminAffiliate> {
  const response = await apiPost<{ affiliate: AdminAffiliate }>(`/admin/affiliates/${affiliateId}/wallet-adjust`, payload);
  return response.data.affiliate;
}

export async function createAdminAffiliateProfile(
  userId: number,
  payload?: { commission_percent?: number },
): Promise<AdminAffiliate> {
  const response = await apiPost<{ affiliate: AdminAffiliate }>(`/admin/users/${userId}/affiliate-profile`, payload || {});
  return response.data.affiliate;
}

export async function listAdminCommissions(
  page: number = 1,
  perPage: number = 20,
  status: string = "all",
  q: string = "",
): Promise<{
  items: AdminCommission[];
  pagination: { current_page: number; per_page: number; total_items: number; total_pages: number };
}> {
  type PaginationResponse = {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };

  const search = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status,
  });
  if (q.trim()) {
    search.set("q", q.trim());
  }

  const response = await apiGet<{ items: AdminCommission[] }>(`/admin/commissions?${search.toString()}`);
  const paginationMeta = response.meta?.pagination as PaginationResponse | undefined;

  return {
    items: response.data.items,
    pagination: {
      current_page: paginationMeta?.current_page || page,
      per_page: paginationMeta?.per_page || perPage,
      total_items: paginationMeta?.total_items || 0,
      total_pages: paginationMeta?.total_pages || 0,
    },
  };
}

export async function updateAdminCommission(
  orderId: number,
  commissionStatus: "pending" | "approved" | "rejected",
): Promise<AdminCommission> {
  const response = await apiPut<{ commission: AdminCommission }>(`/admin/commissions/${orderId}`, {
    commission_status: commissionStatus,
  });
  return response.data.commission;
}

export async function createAdminReview(payload: {
  product_id: number;
  name: string;
  rating: number;
  title?: string;
  role?: string;
  comment: string;
  is_approved?: boolean;
}): Promise<AdminReview> {
  const response = await apiPost<{ review: AdminReview }>("/admin/reviews", payload);
  return response.data.review;
}

export async function getAdminReview(reviewId: number): Promise<AdminReview> {
  const response = await apiGet<{ review: AdminReview }>(`/admin/reviews/${reviewId}`);
  return response.data.review;
}

export async function updateAdminReview(
  reviewId: number,
  payload: { name?: string; rating?: number; title?: string; comment?: string; is_approved?: boolean },
): Promise<AdminReview> {
  const response = await apiPut<{ review: AdminReview }>(`/admin/reviews/${reviewId}`, payload);
  return response.data.review;
}

export async function deleteAdminReview(reviewId: number): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`/admin/reviews/${reviewId}`);
}

export async function createAdminCoupon(payload: {
  code: string;
  coupon_type?: string;
  discount_percent?: number | null;
  discount_amount_fixed?: number | null;
  max_uses?: number | null;
  min_order_value?: number;
  max_discount?: number | null;
  is_active?: boolean;
}): Promise<AdminCoupon> {
  const response = await apiPost<{ coupon: AdminCoupon }>("/admin/coupons", payload);
  return response.data.coupon;
}

export async function getAdminCoupon(couponId: number): Promise<AdminCoupon> {
  const response = await apiGet<{ coupon: AdminCoupon }>(`/admin/coupons/${couponId}`);
  return response.data.coupon;
}

export async function updateAdminCoupon(
  couponId: number,
  payload: {
    code?: string;
    coupon_type?: string;
    discount_percent?: number | null;
    discount_amount_fixed?: number | null;
    max_uses?: number | null;
    min_order_value?: number;
    max_discount?: number | null;
    is_active?: boolean;
  },
): Promise<AdminCoupon> {
  const response = await apiPut<{ coupon: AdminCoupon }>(`/admin/coupons/${couponId}`, payload);
  return response.data.coupon;
}

export async function toggleAdminCoupon(couponId: number): Promise<AdminCoupon> {
  const response = await apiPost<{ coupon: AdminCoupon }>(`/admin/coupons/${couponId}/toggle`, {});
  return response.data.coupon;
}

export async function deleteAdminCoupon(couponId: number): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`/admin/coupons/${couponId}`);
}

export async function getAdminCouponStats(couponId: number): Promise<AdminCouponStats> {
  const response = await apiGet<AdminCouponStats>(`/admin/coupons/${couponId}/stats`);
  return response.data;
}

export async function getAdminPolicy(slug: string): Promise<PolicyPageContent> {
  const response = await apiGet<{ policy: PolicyPageContent }>(`/admin/policies/${encodeURIComponent(slug)}`);
  return response.data.policy;
}

export async function updateAdminPolicy(
  slug: string,
  payload: { title: string; content: string },
): Promise<PolicyPageContent> {
  const response = await apiPut<{ policy: PolicyPageContent }>(`/admin/policies/${encodeURIComponent(slug)}`, payload);
  return response.data.policy;
}

export async function getAffiliateDashboard(): Promise<AffiliateDashboardData> {
  const response = await apiGet<AffiliateDashboardData>("/affiliate/dashboard");
  return response.data;
}
