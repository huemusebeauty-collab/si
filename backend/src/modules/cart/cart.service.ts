import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CartEntity } from "./entities/cart.entity";
import { CartLineItemEntity } from "./entities/cart-line-item.entity";
import { ProductsService } from "@/modules/products/products.service";
import { CouponsService } from "@/admin/coupons/coupons.service";
import { SettingsService } from "@/admin/settings/settings.service";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity) private readonly carts: Repository<CartEntity>,
    @InjectRepository(CartLineItemEntity) private readonly lineItems: Repository<CartLineItemEntity>,
    private readonly products: ProductsService,
    private readonly coupons: CouponsService,
    private readonly settings: SettingsService,
  ) {}

  async createCart(sessionOrCustomerId: { sessionId?: string; customerId?: string }): Promise<CartEntity> {
    const cart = this.carts.create(sessionOrCustomerId);
    return this.carts.save(cart);
  }

  async findById(cartId: string, access?: { sessionId?: string; userId?: string }): Promise<CartEntity> {
    const cart = await this.carts.findOne({ where: { id: cartId }, relations: ["lineItems"] });
    if (!cart) throw new NotFoundException("Cart not found.");
    if (access) {
      const ownsAsCustomer = Boolean(access.userId && cart.customerId === access.userId);
      const ownsAsGuest = Boolean(access.sessionId && cart.sessionId === access.sessionId);
      if (!ownsAsCustomer && !ownsAsGuest) {
        throw new ForbiddenException("You do not have access to this cart.");
      }
    }
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

  async addItem(cartId: string, variantId: string, quantity: number, access?: { sessionId?: string; userId?: string }): Promise<CartEntity> {
    this.validateQuantity(quantity);
    const cart = await this.findById(cartId, access);
    const existing = cart.lineItems.find((li) => li.variantId === variantId && !li.savedForLater);
    const totalRequested = (existing?.quantity ?? 0) + quantity;
    await this.assertStockAvailable(variantId, totalRequested);
    if (existing) {
      existing.quantity = totalRequested;
      await this.lineItems.save(existing);
    } else {
      await this.lineItems.save(this.lineItems.create({ cart, variantId, quantity }));
    }
    return this.findById(cartId, access);
  }

  async updateQuantity(cartId: string, lineItemId: string, quantity: number, access?: { sessionId?: string; userId?: string }): Promise<CartEntity> {
    this.validateQuantity(quantity);
    await this.findById(cartId, access);
    const item = await this.lineItems.findOne({ where: { id: lineItemId, cart: { id: cartId } } });
    if (!item) throw new NotFoundException("Cart line item not found.");
    await this.assertStockAvailable(item.variantId, quantity);
    item.quantity = quantity;
    await this.lineItems.save(item);
    return this.findById(cartId, access);
  }

  async removeItem(cartId: string, lineItemId: string, access?: { sessionId?: string; userId?: string }): Promise<CartEntity> {
    await this.findById(cartId, access);
    await this.lineItems.delete({ id: lineItemId, cart: { id: cartId } });
    return this.findById(cartId, access);
  }

  async saveForLater(cartId: string, lineItemId: string, access?: { sessionId?: string; userId?: string }): Promise<CartEntity> {
    await this.findById(cartId, access);
    await this.lineItems.update({ id: lineItemId, cart: { id: cartId } }, { savedForLater: true });
    return this.findById(cartId, access);
  }

  async moveBackToCart(cartId: string, savedItemId: string, access?: { sessionId?: string; userId?: string }): Promise<CartEntity> {
    await this.findById(cartId, access);
    await this.lineItems.update({ id: savedItemId, cart: { id: cartId } }, { savedForLater: false });
    return this.findById(cartId, access);
  }

  async validateCart(cartId: string, access?: { sessionId?: string; userId?: string }): Promise<{ valid: boolean; issues: string[] }> {
    const cart = await this.findById(cartId, access);
    const issues: string[] = [];
    for (const item of cart.lineItems.filter((li) => !li.savedForLater)) {
      const variant = await this.products.findVariantById(item.variantId).catch(() => null);
      if (!variant) issues.push(`Line item ${item.id} references a product that no longer exists.`);
      else if (variant.stockQuantity < item.quantity) issues.push(`Only ${variant.stockQuantity} unit(s) of "${variant.name}" remain — cart has ${item.quantity}.`);
    }
    return { valid: issues.length === 0, issues };
  }

  async getTotals(cartId: string, access?: { sessionId?: string; userId?: string }): Promise<{ subtotal: number; discountAmount: number; total: number; itemCount: number }> {
    const cart = await this.findById(cartId, access);
    let subtotal = 0;
    let itemCount = 0;
    for (const item of cart.lineItems.filter((li) => !li.savedForLater)) {
      const variant = await this.products.findVariantById(item.variantId).catch(() => null);
      if (!variant) continue;
      const unitPrice = Number(variant.product.salePrice ?? variant.product.price);
      subtotal += unitPrice * item.quantity;
      itemCount += item.quantity;
    }
    const discountAmount = Number(cart.discountAmount ?? 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    return { subtotal: roundedSubtotal, discountAmount, total: Math.max(0, Math.round((roundedSubtotal - discountAmount) * 100) / 100), itemCount };
  }

  async applyCoupon(cartId: string, code: string, access?: { sessionId?: string; userId?: string }): Promise<CartEntity> {
    const couponsEnabled = await this.settings.isFeatureEnabled("coupons.enabled");
    if (!couponsEnabled) throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, "Coupon codes are not currently available.");
    const cart = await this.findById(cartId, access);
    const totals = await this.getTotals(cartId, access);
    const { discountAmount } = await this.coupons.validateAndComputeDiscount(code, totals.subtotal);
    cart.couponCode = code;
    cart.discountAmount = discountAmount.toFixed(2);
    await this.carts.save(cart);
    return cart;
  }

  async estimateShipping(_cartId: string, _postalCode: string, _access?: { sessionId?: string; userId?: string }): Promise<{ available: false; reason: string }> {
    return { available: false, reason: "Shipping configuration is not yet implemented (Settings module, future sprint)." };
  }

  async mergeGuestCart(
    sessionId: string,
    customerId: string,
    access: { sessionId: string; userId: string },
  ): Promise<CartEntity> {
    if (access.userId !== customerId || access.sessionId !== sessionId) {
      throw new ForbiddenException("Cart merge ownership could not be verified.");
    }

    const guestCart = await this.carts.findOne({ where: { sessionId }, relations: ["lineItems"] });
    let customerCart = await this.carts.findOne({ where: { customerId }, relations: ["lineItems"] });
    if (!customerCart) customerCart = await this.createCart({ customerId });

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
    return this.findById(customerCart.id, { userId: customerId });
  }
}