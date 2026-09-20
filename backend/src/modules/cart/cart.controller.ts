import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CartService } from "./cart.service";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";

@ApiTags("cart")
@Controller({ path: "carts", version: "1" })
export class CartController {
  constructor(private readonly cart: CartService) {}

  private access(sessionId: string | undefined, user: AuthenticatedUser | undefined) {
    return { sessionId, userId: user?.id };
  }

  @Public()
  @Post()
  create(
    @Body() body: { sessionId?: string; customerId?: string },
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    if (body.customerId && (!user || user.id !== body.customerId)) {
      throw new ForbiddenException("The cart customerId must match the authenticated customer.");
    }
    return this.cart.createCart(user ? { sessionId: body.sessionId, customerId: user.id } : { sessionId: body.sessionId });
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

  // Cart merge is an authenticated operation: it moves a guest session's
  // contents into the authenticated customer's cart.
  @Post("merge")
  mergeGuestCart(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers("x-cart-session-id") sessionId: string | undefined,
    @Body() body: { sessionId: string; customerId: string },
  ) {
    if (!user || user.id !== body.customerId) {
      throw new ForbiddenException("The cart merge customerId must match the authenticated customer.");
    }
    if (!sessionId || sessionId !== body.sessionId) {
      throw new ForbiddenException("The cart merge session must match the authenticated guest session.");
    }
    return this.cart.mergeGuestCart(body.sessionId, body.customerId, { sessionId, userId: user.id });
  }
}