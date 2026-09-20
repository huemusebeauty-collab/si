import { createGuestCheckoutToken, verifyGuestCheckoutToken } from "./guest-checkout-token";

describe("guest checkout token", () => {
  const orderId = "order-123";

  it("creates a token that is scoped to the order and expires", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = createGuestCheckoutToken(orderId, 1_000);

    expect(verifyGuestCheckoutToken(orderId, token, 1_000)).toBe(true);
    expect(verifyGuestCheckoutToken("order-other", token, 1_000)).toBe(false);
    expect(verifyGuestCheckoutToken(orderId, token, 2_801)).toBe(false);
  });

  it("rejects tampering", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = createGuestCheckoutToken(orderId, 1_000);
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

    expect(verifyGuestCheckoutToken(orderId, tampered, 1_000)).toBe(false);
  });
});
