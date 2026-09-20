import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 30 * 60;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for guest checkout token signing.");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createGuestCheckoutToken(orderId: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const expiresAt = nowSeconds + TOKEN_TTL_SECONDS;
  const payload = `${orderId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyGuestCheckoutToken(orderId: string, token: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenOrderId, expiresAtText, signature] = parts;
  if (tokenOrderId !== orderId) return false;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < nowSeconds) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;

  const expected = Buffer.from(sign(`${tokenOrderId}.${expiresAtText}`));
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
