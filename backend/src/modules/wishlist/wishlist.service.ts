import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import { WishlistEntity } from "./entities/wishlist.entity";
import { WishlistItemEntity } from "./entities/wishlist-item.entity";
import { CartService } from "@/modules/cart/cart.service";
import { ProductsService } from "@/modules/products/products.service";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";

// Sprint 3.5 — WishlistService, method signatures per Phase 16 §16.5.
// Sprint 4.5 — Wishlist: duplicate prevention (already present since
// Sprint 3), move to cart (already present), plus wishlist validation
// (variant must actually exist) added this sprint.
@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistEntity) private readonly wishlists: Repository<WishlistEntity>,
    @InjectRepository(WishlistItemEntity) private readonly items: Repository<WishlistItemEntity>,
    private readonly cart: CartService,
    private readonly products: ProductsService,
  ) {}

  private async findOrCreate(ownerId: { sessionId?: string; customerId?: string }): Promise<WishlistEntity> {
    const existing = await this.wishlists.findOne({
      where: ownerId.customerId ? { customerId: ownerId.customerId } : { sessionId: ownerId.sessionId },
      relations: ["items"],
    });
    if (existing) return existing;
    return this.wishlists.save(this.wishlists.create(ownerId));
  }

  // getWishlist(sessionOrCustomerId) -> Wishlist
  async getWishlist(ownerId: { sessionId?: string; customerId?: string }): Promise<WishlistEntity> {
    return this.findOrCreate(ownerId);
  }

  // addItem(sessionOrCustomerId, skuId) -> Wishlist
  // Sprint 4.5 — validates the variant exists before adding (Wishlist
  // Validation deliverable); duplicate prevention unchanged from Sprint 3.
  async addItem(ownerId: { sessionId?: string; customerId?: string }, variantId: string): Promise<WishlistEntity> {
    await this.products.findVariantById(variantId); // throws NotFoundException if the variant doesn't exist
    const wishlist = await this.findOrCreate(ownerId);
    const already = wishlist.items.some((i) => i.variantId === variantId);
    if (already) {
      throw new DomainException(DomainErrorCode.DUPLICATE_WISHLIST_ITEM, "This item is already in your wishlist.");
    }
    await this.items.save(this.items.create({ wishlist, variantId }));
    return this.findOrCreate(ownerId);
  }

  // removeItem(sessionOrCustomerId, skuId) -> Wishlist
  async removeItem(ownerId: { sessionId?: string; customerId?: string }, variantId: string): Promise<WishlistEntity> {
    const wishlist = await this.findOrCreate(ownerId);
    await this.items.delete({ wishlist: { id: wishlist.id }, variantId });
    return this.findOrCreate(ownerId);
  }

  // moveToCart(sessionOrCustomerId, skuId, cartId) -> Cart
  async moveToCart(
    ownerId: { sessionId?: string; customerId?: string },
    variantId: string,
    cartId: string,
  ): Promise<unknown> {
    await this.removeItem(ownerId, variantId);
    return this.cart.addItem(cartId, variantId, 1);
  }

  // mergeGuestWishlist(sessionId, customerId) -> Wishlist
  async mergeGuestWishlist(sessionId: string, customerId: string): Promise<WishlistEntity> {
    const guest = await this.wishlists.findOne({ where: { sessionId }, relations: ["items"] });
    const customerWishlist = await this.findOrCreate({ customerId });
    if (guest) {
      for (const item of guest.items) {
        const already = customerWishlist.items.some((i) => i.variantId === item.variantId);
        if (!already) {
          await this.items.save(this.items.create({ wishlist: customerWishlist, variantId: item.variantId }));
        }
      }
      await this.wishlists.delete(guest.id);
    }
    return this.findOrCreate({ customerId });
  }

  // generateShareLink(customerId) -> {token, url}
  async generateShareLink(customerId: string): Promise<{ token: string }> {
    const wishlist = await this.findOrCreate({ customerId });
    const token = randomBytes(16).toString("hex");
    wishlist.shareToken = token;
    await this.wishlists.save(wishlist);
    return { token };
  }

  // getSharedWishlist(token) -> Wishlist (read-only, public)
  async getSharedWishlist(token: string): Promise<WishlistEntity> {
    const wishlist = await this.wishlists.findOne({ where: { shareToken: token }, relations: ["items"] });
    if (!wishlist) throw new NotFoundException("Shared wishlist not found.");
    return wishlist;
  }
}
