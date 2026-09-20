import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CartService } from "./cart.service";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";

// Sprint 3.6 — @Public: cart supports guest sessions per Phase 8 §6;
// customer-linking on login/registration (guest-cart merge) is a Sprint
// 4+ completion once the full auth upgrade flow is built.
@ApiTags("cart")
@Controller({ path: "carts", version: "1" })
export class CartController {
  constructor(private readonly cart: CartService) {}

  private access(sessionId: string | undefined, user: AuthenticatedUser | undefined) {
    return { sessionId, userId: user?.id };
  }

  @Public()
  @Post()
  create(@Body() body: { sessionId?: string; customerId?: string }) {
    return this.cart.createCart(body);
  }

  @Public()
  @Get(":cartId")
  get(@Param("cartId") cartId: string, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.findById(cartId, this.access(sessionId, user));
  }

  @Public()
  @Post(":cartId/items")
  addItem(@Param("cartId") cartId: string, @Body() dto: AddCartItemDto, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.addItem(cartId, dto.variantId, dto.quantity, this.access(sessionId, user));
  }

  @Public()
  @Patch(":cartId/items/:lineItemId")
  updateQuantity(
    @Param("cartId") cartId: string,
    @Param("lineItemId") lineItemId: string,
    @Body("quantity") quantity: number,
    @Headers("x-cart-session-id") sessionId: string | undefined,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.cart.updateQuantity(cartId, lineItemId, quantity, this.access(sessionId, user));
  }

  @Public()
  @Delete(":cartId/items/:lineItemId")
  removeItem(@Param("cartId") cartId: string, @Param("lineItemId") lineItemId: string, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.removeItem(cartId, lineItemId, this.access(sessionId, user));
  }

  @Public()
  @Post(":cartId/items/:lineItemId/save-for-later")
  saveForLater(@Param("cartId") cartId: string, @Param("lineItemId") lineItemId: string, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.saveForLater(cartId, lineItemId, this.access(sessionId, user));
  }

  @Public()
  @Post(":cartId/saved/:savedItemId/move-to-cart")
  moveBackToCart(@Param("cartId") cartId: string, @Param("savedItemId") savedItemId: string, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.moveBackToCart(cartId, savedItemId, this.access(sessionId, user));
  }

  @Public()
  @Get(":cartId/validate")
  validate(@Param("cartId") cartId: string, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.validateCart(cartId, this.access(sessionId, user));
  }

  @Public()
  @Post(":cartId/coupon")
  applyCoupon(@Param("cartId") cartId: string, @Body("code") code: string, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.applyCoupon(cartId, code, this.access(sessionId, user));
  }

  @Public()
  @Get(":cartId/shipping-estimate")
  estimateShipping(@Param("cartId") cartId: string, @Query("postalCode") postalCode: string | undefined, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.estimateShipping(cartId, postalCode ?? "", this.access(sessionId, user));
  }

  @Public()
  @Get(":cartId/totals")
  getTotals(@Param("cartId") cartId: string, @Headers("x-cart-session-id") sessionId: string | undefined, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.cart.getTotals(cartId, this.access(sessionId, user));
  }

  // Sprint 4.4 — Cart merge after login. Called by the client
  // immediately after a successful login/registration response (Phase
  // 8 §6's guest-to-registered upgrade), passing the guest session's ID.
  //
  // Sprint 10 security correction: this endpoint trusted a
  // client-supplied `customerId` with no verification — the same IDOR
  // pattern Sprint 9 found and fixed in `WishlistController`
  // (DEF-9-01), found here during Sprint 10's project-wide follow-up
  // audit of every `@Public()` endpoint for that exact pattern.
  // Unauthenticated, anyone could merge arbitrary guest-cart contents
  // into another customer's real cart. Fixed with the same established
  // pattern used in `OrdersController.create` and
  // `WishlistController` — a supplied `customerId` must match the
  // authenticated caller when a token is present.
  @Public()
  @Post("merge")
  mergeGuestCart(@CurrentUser() user: AuthenticatedUser | undefined, @Body() body: { sessionId: string; customerId: string }) {
    if (user && user.id !== body.customerId) {
      throw new ForbiddenException("The cart merge customerId must match the authenticated customer.");
    }
    return this.cart.mergeGuestCart(body.sessionId, body.customerId);
  }
}