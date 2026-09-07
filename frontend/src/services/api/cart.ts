const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const CART_STORAGE_KEY = "silku-cart-id";
const SESSION_STORAGE_KEY = "silku-session-id";

interface ApiEnvelope<T> { data: T; }

export interface ApiCartLineItem {
  id: string;
  variantId: string;
  quantity: number;
  savedForLater: boolean;
}

export interface ApiCart {
  id: string;
  lineItems: ApiCartLineItem[];
  couponCode?: string;
  discountAmount?: string;
}

export interface ApiOrder {
  id: string;
  customerId: string;
  status: string;
  total: string;
  currency: string;
  shippingAddress: Record<string, unknown>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | { message?: string } | null;
  if (!response.ok) {
    throw new Error(body && "message" in body && body.message ? body.message : "Cart request failed.");
  }
  return (body as ApiEnvelope<T>).data;
}

export function getStoredCartId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CART_STORAGE_KEY);
}

export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

function storeCartId(id: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(CART_STORAGE_KEY, id);
}

export async function getOrCreateGuestCart(): Promise<ApiCart> {
  const existingId = getStoredCartId();
  if (existingId) {
    try { return await request<ApiCart>(`/carts/${existingId}`); }
    catch { window.localStorage.removeItem(CART_STORAGE_KEY); }
  }
  const sessionId = typeof window !== "undefined" ? getOrCreateSessionId() : undefined;
  const cart = await request<ApiCart>("/carts", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
  storeCartId(cart.id);
  return cart;
}

function getOrCreateSessionId(): string {
  const current = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (current) return current;
  const id = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
}

export async function addCartItem(variantId: string, quantity: number): Promise<ApiCart> {
  const cart = await getOrCreateGuestCart();
  return request<ApiCart>(`/carts/${cart.id}/items`, {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
}

export async function updateCartItem(lineItemId: string, quantity: number): Promise<ApiCart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("Cart not found.");
  return request<ApiCart>(`/carts/${cartId}/items/${lineItemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(lineItemId: string): Promise<ApiCart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("Cart not found.");
  return request<ApiCart>(`/carts/${cartId}/items/${lineItemId}`, { method: "DELETE" });
}

export async function getCartTotals(): Promise<{ subtotal: number; discountAmount: number; total: number; itemCount: number }> {
  const cartId = getStoredCartId();
  if (!cartId) return { subtotal: 0, discountAmount: 0, total: 0, itemCount: 0 };
  return request(`/carts/${cartId}/totals`);
}

export async function createOrder(shippingAddress: Record<string, string>): Promise<ApiOrder> {
  const cartId = getStoredCartId();
  const sessionId = getStoredSessionId();
  if (!cartId || !sessionId) throw new Error("Your cart session could not be found. Please return to cart and try again.");
  return request<ApiOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ customerId: sessionId, cartId, shippingAddress }),
  });
}
