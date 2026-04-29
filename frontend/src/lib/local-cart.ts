/**
 * localStorage-based cart fallback for when the backend API is unreachable.
 * Mirrors the shape of CartData / CartLineItem so the UI can render identically.
 */

import type { CartData, CartLineItem, ProductCard, CheckoutPreview } from "@/lib/api";

const STORAGE_KEY = "dominate_local_cart";

/* ── Fallback product catalog (must stay in sync with /products page fallbacks) ── */

const FALLBACK_CATALOG: Record<number, ProductCard> = {
  [-1]: {
    id: -1,
    name: "Liquid Chalk",
    slug: "liquid-chalk",
    description:
      "Premium liquid chalk made with edible-grade Magnesium Carbonate. Strong grip, zero slip.",
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
    primary_image: {
      id: 0,
      path: "",
      url: "/liquid-chalk-dominate200ml.png",
      thumbnail_url: "/liquid-chalk-dominate200ml.png",
      is_primary: true,
      display_order: 0,
    },
  },
  [-2]: {
    id: -2,
    name: "Standard Parallettes",
    slug: "standard-parallettes",
    description:
      "Premium wooden parallettes for calisthenics training. Handcrafted for dips, L-sits, and progression work.",
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
    primary_image: {
      id: 0,
      path: "",
      url: "/dominate-parallettes-standard.png",
      thumbnail_url: "/dominate-parallettes-standard.png",
      is_primary: true,
      display_order: 0,
    },
  },
};

/* ── Internal storage shape ── */

type StoredItem = {
  product_id: number;
  variant_id: number | null;
  quantity: number;
};

function readStorage(): StoredItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: StoredItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

function formatPrice(paise: number): string {
  return `\u20B9${(paise / 100).toFixed(0)}`;
}

function buildCartData(stored: StoredItem[]): CartData {
  const items: CartLineItem[] = [];
  let total = 0;
  let count = 0;

  for (const entry of stored) {
    const product = FALLBACK_CATALOG[entry.product_id];
    if (!product) continue;

    const unitPrice = product.price;
    const subtotal = unitPrice * entry.quantity;
    total += subtotal;
    count += entry.quantity;

    items.push({
      product_id: entry.product_id,
      variant_id: entry.variant_id,
      variant_label: null,
      quantity: entry.quantity,
      unit_price: unitPrice,
      unit_price_display: formatPrice(unitPrice),
      subtotal,
      subtotal_display: formatPrice(subtotal),
      product,
    });
  }

  return {
    items,
    count,
    total,
    total_display: formatPrice(total),
  };
}

/* ── Public API (mirrors the backend cart API shape) ── */

export function getLocalCart(): CartData {
  return buildCartData(readStorage());
}

export function addLocalCartItem(
  productId: number,
  quantity: number,
  _variantId?: number | null,
): CartData {
  const items = readStorage();
  const existing = items.find(
    (i) => i.product_id === productId && i.variant_id === (_variantId ?? null),
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      product_id: productId,
      variant_id: _variantId ?? null,
      quantity,
    });
  }

  writeStorage(items);
  return buildCartData(items);
}

export function updateLocalCartItem(productId: number, quantity: number): CartData {
  let items = readStorage();

  if (quantity <= 0) {
    items = items.filter((i) => i.product_id !== productId);
  } else {
    const existing = items.find((i) => i.product_id === productId);
    if (existing) {
      existing.quantity = quantity;
    }
  }

  writeStorage(items);
  return buildCartData(items);
}

export function removeLocalCartItem(productId: number): CartData {
  const items = readStorage().filter((i) => i.product_id !== productId);
  writeStorage(items);
  return buildCartData(items);
}

export function clearLocalCart(): CartData {
  writeStorage([]);
  return buildCartData([]);
}

export function getLocalCheckoutPreview(): CheckoutPreview {
  const cart = getLocalCart();
  return {
    cart,
    coupon: null,
    discount: 0,
    discount_display: formatPrice(0),
    payable_total: cart.total,
    payable_total_display: cart.total_display,
  };
}

/** Returns true if the product ID is a known fallback product */
export function isLocalProduct(productId: number): boolean {
  return productId in FALLBACK_CATALOG;
}
