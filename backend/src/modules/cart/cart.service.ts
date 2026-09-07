import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CartEntity } from "./entities/cart.entity";
import { CartLineItemEntity } from "./entities/cart-line-item.entity";
import { ProductsService } from "@/modules/products/products.service";
import { CouponsService } from "@/admin/coupons/coupons.service";
import { SettingsService } from "@/admin/settings/settings.service";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";

// Sprint 3.5 — CartService, method signatures per Phase 16 §16.6.
// Sprint 4.4 — Cart Business Logic: real stock validation at write time
// (not just at checkout), cart totals, and guest-to-logged-in cart
// merge on login (Phase 8 §6's seamless upgrade path).
@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity) private readonly carts: Repository<CartEntity>,
    @InjectRepository(CartLineItemEntity) private readonly lineItems: Repository<CartLineItemEntity>,
    private readonly products: ProductsService, // cross-module: service interface only, per Phase 8 §3
    private readonly coupons: CouponsService,
    private readonly settings: SettingsService,
  ) {}

  // createCart(sessionOrCustomerId) -> Cart
  async createCart(sessionOrCustomerId: { sessionId?: string; customerId?: string }): Promise<CartEntity> {
    const cart = this.carts.create(sessionOrCustomerId);
    return this.carts.save(cart);
  }

  async findById(cartId: string): Promise<CartEntity> {
    const cart = await this.carts.findOne({ where: { id: cartId }, relations: ["lineItems"] });
    if (!cart) throw new NotFoundException("Cart not found.");
    return cart;
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new DomainException(DomainErrorCode.INVALID_QUANTITY, "Quantity must be a whole number of at least 1.");
    }
  }

  private async assertStockAvailable(variantId: string, requestedQuantity: number): Promise<void> {
    const variant = await this.products.findVariantById(variantId);
    if (variant.stockQuantity < requestedQuantity) {
      throw new DomainException(
        DomainErrorCode.INSUFFICIENT_STOCK,
        `Only ${variant.stockQuantity} unit(s) of "${variant.name}" are available.`,
      );
    }
  }

  // addItem(cartId, skuId, quantity) -> Cart
  // Sprint 4.4 — validates quantity shape AND real stock availability
  // before writing, rather than only at checkout-time validateCart.
  async addItem(cartId: string, variantId: string, quantity: number): Promise<CartEntity> {
    this.validateQuantity(quantity);
    const cart = await this.findById(cartId);
    const existing = cart.lineItems.find((li) => li.variantId === variantId && !li.savedForLater);
    const totalRequested = (existing?.quantity ?? 0) + quantity;
    await this.assertStockAvailable(variantId, totalRequested);

    if (existing) {
      existing.quantity = totalRequested;
      await this.lineItems.save(existing);
    } else {
      await this.lineItems.save(this.lineItems.create({ cart, variantId, quantity }));
    }
    return this.findById(cartId);
  }

  // updateQuantity(cartId, lineItemId, quantity) -> Cart
  async updateQuantity(cartId: string, lineItemId: string, quantity: number): Promise<CartEntity> {
    this.validateQuantity(quantity);
    const item = await this.lineItems.findOne({ where: { id: lineItemId, cart: { id: cartId } } });
    if (!item) throw new NotFoundException("Cart line item not found.");
    await this.assertStockAvailable(item.variantId, quantity);
    item.quantity = quantity;
    await this.lineItems.save(item);
    return this.findById(cartId);
  }

  // removeItem(cartId, lineItemId) -> Cart
  async removeItem(cartId: string, lineItemId: string): Promise<CartEntity> {
    await this.lineItems.delete({ id: lineItemId, cart: { id: cartId } });
    return this.findById(cartId);
  }

  // saveForLater(cartId, lineItemId) -> Cart
  async saveForLater(cartId: string, lineItemId: string): Promise<CartEntity> {
    await this.lineItems.update({ id: lineItemId, cart: { id: cartId } }, { savedForLater: true });
    return this.findById(cartId);
  }

  // moveBackToCart(cartId, savedItemId) -> Cart
  async moveBackToCart(cartId: string, savedItemId: string): Promise<CartEntity> {
    await this.lineItems.update({ id: savedItemId, cart: { id: cartId } }, { savedForLater: false });
    return this.findById(cartId);
  }

  // validateCart(cartId) -> ValidationResult (stock, price, coupon still valid)
  // Sprint 4.4 — re-checks exact quantity against current stock (not
  // just coarse StockState), catching stale cart data from a long
  // browsing session per Phase 16 §16.6.
  async validateCart(cartId: string): Promise<{ valid: boolean; issues: string[] }> {
    const cart = await this.findById(cartId);
    const issues: string[] = [];
    for (const item of cart.lineItems.filter((li) => !li.savedForLater)) {
      const variant = await this.products.findVariantById(item.variantId).catch(() => null);
      if (!variant) {
        issues.push(`Line item ${item.id} references a product that no longer exists.`);
      } else if (variant.stockQuantity < item.quantity) {
        issues.push(`Only ${variant.stockQuantity} unit(s) of "${variant.name}" remain — cart has ${item.quantity}.`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  // Sprint 4.4 — cart totals. Reads current price from the variant's
  // Product relation (Phase 8 §4 — Cart "reads product/price data, does
  // not own it"); does NOT snapshot price — that happens at Order
  // creation only, per Phase 8 §4's immutability principle applying to
  // Orders specifically, not Cart.
  async getTotals(cartId: string): Promise<{ subtotal: number; discountAmount: number; total: number; itemCount: number }> {
    const cart = await this.findById(cartId);
    let subtotal = 0;
    let itemCount = 0;
    for (const item of cart.lineItems.filter((li) => !li.savedForLater)) {
      const variant = await this.products.findVariantById(item.variantId).catch(() => null);
      if (!variant) continue; // Sprint 4.4 — validateCart() is the endpoint that surfaces this as an issue; totals silently skip it
      const unitPrice = Number(variant.product.salePrice ?? variant.product.price);
      subtotal += unitPrice * item.quantity;
      itemCount += item.quantity;
    }
    const discountAmount = Number(cart.discountAmount ?? 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    return {
      subtotal: roundedSubtotal,
      discountAmount,
      total: Math.max(0, Math.round((roundedSubtotal - discountAmount) * 100) / 100),
      itemCount,
    };
  }

  // applyCoupon(cartId, code) -> Cart (with discount applied)
  // Sprint 6 — real validation and discount computation via
  // CouponsService, replacing Sprint 3/4's "store the code, compute
  // nothing" stub now that the Coupons module exists.
  // Sprint 7.5 — gated behind the "coupons.enabled" feature flag (see
  // FEATURE_FLAGS.md) — the first real, working example of a flag
  // actually gating behavior rather than just being stored data.
  async applyCoupon(cartId: string, code: string): Promise<CartEntity> {
    const couponsEnabled = await this.settings.isFeatureEnabled("coupons.enabled");
    if (!couponsEnabled) {
      throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, "Coupon codes are not currently available.");
    }
    const cart = await this.findById(cartId);
    const totals = await this.getTotals(cartId);
    const { discountAmount } = await this.coupons.validateAndComputeDiscount(code, totals.subtotal);
    cart.couponCode = code;
    cart.discountAmount = discountAmount.toFixed(2);
    await this.carts.save(cart);
    return cart;
  }

  // estimateShipping(cartId, postalCode) -> ShippingEstimate
  // Sprint 4.4 — "Shipping estimate placeholders" per this sprint's own
  // deliverable wording; Settings module remains out of scope.
  async estimateShipping(_cartId: string, _postalCode: string): Promise<{ available: false; reason: string }> {
    return { available: false, reason: "Shipping configuration is not yet implemented (Settings module, future sprint)." };
  }

  // Sprint 4.4 — Cart merge after login. Guest cart's line items are
  // merged into the customer's existing cart (creating one if none
  // exists), summing quantities for duplicate variants, then the guest
  // cart is deleted. Mirrors WishlistService.mergeGuestWishlist's
  // pattern (Sprint 3) for consistency across the two guest-state
  // upgrade paths.
  async mergeGuestCart(sessionId: string, customerId: string): Promise<CartEntity> {
    const guestCart = await this.carts.findOne({ where: { sessionId }, relations: ["lineItems"] });
    let customerCart = await this.carts.findOne({ where: { customerId }, relations: ["lineItems"] });
    if (!customerCart) {
      customerCart = await this.createCart({ customerId });
    }

    if (guestCart) {
      for (const item of guestCart.lineItems) {
        const existing = customerCart.lineItems.find((li) => li.variantId === item.variantId && !li.savedForLater);
        if (existing) {
          existing.quantity += item.quantity;
          await this.lineItems.save(existing);
        } else {
          await this.lineItems.save(
            this.lineItems.create({ cart: customerCart, variantId: item.variantId, quantity: item.quantity, savedForLater: item.savedForLater }),
          );
        }
      }
      await this.carts.delete(guestCart.id);
    }
    return this.findById(customerCart.id);
  }
}
