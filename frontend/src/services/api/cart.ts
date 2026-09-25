const CART_STORAGE_KEY = "silku-cart-id";
const SESSION_STORAGE_KEY = "silku-session-id";
import { authenticatedFetch } from "./auth";

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
  guestCheckoutToken?: string;
}

export interface PaymentIntentResponse {
  providerReference: string;
  status: string;
  amount: number;
  currency: string;
  clientSecret?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionId = typeof window !== "undefined" ? getStoredSessionId() : null;
  const response = await authenticatedFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "x-cart-session-id": sessionId } : {}),
      ...(init?.headers ?? {}),
    },
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

function notifyCartUpdated(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("silku-cart-updated"));
}

export async function addCartItem(variantId: string, quantity: number): Promise<ApiCart> {
  const cart = await getOrCreateGuestCart();
  const updated = await request<ApiCart>(`/carts/${cart.id}/items`, {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
  notifyCartUpdated();
  return updated;
}

export async function updateCartItem(lineItemId: string, quantity: number): Promise<ApiCart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("Cart not found.");
  const updated = await request<ApiCart>(`/carts/${cartId}/items/${lineItemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
  notifyCartUpdated();
  return updated;
}

export async function removeCartItem(lineItemId: string): Promise<ApiCart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("Cart not found.");
  const updated = await request<ApiCart>(`/carts/${cartId}/items/${lineItemId}`, { method: "DELETE" });
  notifyCartUpdated();
  return updated;
}

export async function getCartTotals(): Promise<{ subtotal: number; discountAmount: number; total: number; itemCount: number }> {
  const cartId = getStoredCartId();
  if (!cartId) return { subtotal: 0, discountAmount: 0, total: 0, itemCount: 0 };
  return request(`/carts/${cartId}/totals`);
}

export async function mergeGuestCart(customerId: string): Promise<ApiCart | null> {
  const sessionId = getStoredSessionId();
  if (!sessionId) return null;
  const cart = await request<ApiCart>("/carts/merge", {
    method: "POST",
    body: JSON.stringify({ sessionId, customerId }),
  });
  storeCartId(cart.id);
  notifyCartUpdated();
  return cart;
}

export async function createOrder(shippingAddress: Record<string, string>, idempotencyKey?: string): Promise<ApiOrder> {
  const cartId = getStoredCartId();
  const sessionId = getStoredSessionId();
  if (!cartId || !sessionId) throw new Error("Your cart session could not be found. Please return to cart and try again.");
  return request<ApiOrder>("/orders", {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    body: JSON.stringify({
      customerId: sessionId,
      cartId,
      shippingAddress: {
        line1: shippingAddress.addressLine1,
        line2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        region: shippingAddress.state,
        stateCode: shippingAddress.stateCode,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
      },
      customerGstin: shippingAddress.customerGstin || undefined,
      customerLegalName: shippingAddress.customerLegalName || undefined,
    }),
  });
}

export async function initiatePayment(order: ApiOrder, idempotencyKey: string): Promise<PaymentIntentResponse> {
  return request<PaymentIntentResponse>("/payments/initiate", {
    method: "POST",
    body: JSON.stringify({
      orderId: order.id,
      amount: Number(order.total),
      currency: order.currency,
      idempotencyKey,
      guestCheckoutToken: order.guestCheckoutToken,
    }),
  });
}

export async function syncPayment(providerReference: string, guestCheckoutToken?: string): Promise<unknown> {
  return request(`/payments/${encodeURIComponent(providerReference)}/sync`, {
    headers: guestCheckoutToken ? { "x-guest-checkout-token": guestCheckoutToken } : undefined,
  });
}
