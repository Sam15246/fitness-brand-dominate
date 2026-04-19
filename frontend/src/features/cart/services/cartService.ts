import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
  type CartData,
} from "@/lib/api";

export async function fetchCart(): Promise<CartData> {
  return getCart();
}

export async function addCartItem(productId: number, quantity: number = 1): Promise<CartData> {
  return addToCart({ product_id: productId, quantity });
}

export async function setCartItemQuantity(productId: number, quantity: number): Promise<CartData> {
  return updateCartItem(productId, quantity);
}

export async function removeCartLine(productId: number): Promise<CartData> {
  return removeCartItem(productId);
}

export async function clearEntireCart(): Promise<CartData> {
  return clearCart();
}
