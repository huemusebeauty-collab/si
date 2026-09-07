import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { WishlistService } from "./wishlist.service";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";

// Sprint 3.6/Phase 16 §16.5 — getSharedWishlist is "the one deliberate
// unauthenticated, token-scoped read endpoint" — explicitly called out
// in the frozen spec, not an oversight.
//
// Sprint 9 security correction: every OTHER endpoint here was
// `@Public()` and trusted a client-supplied `customerId` in the
// request body/query with no verification against the caller's actual
// identity — a real IDOR: anyone who knew or guessed another
// customer's ID could read or modify that customer's wishlist. Found
// during Sprint 9's security hardening review (this module wasn't
// caught by any earlier sprint's review because its existence itself
// wasn't correctly tracked — see `SPRINT_9_CORRECTION_NOTICE.md`).
// Fixed using the exact same pattern Sprint 4 already established for
// this identical problem in `OrdersController.create`: the route stays
// `@Public()` (guest wishlists via `sessionId` are legitimate and must
// keep working unauthenticated), but `JwtAuthGuard`'s optional-auth
// behavior means `@CurrentUser()` is populated whenever a valid token
// IS present — and if it is, a caller-supplied `customerId` that
// doesn't match the authenticated user's own ID is rejected outright.
@ApiTags("wishlist")
@Controller({ path: "wishlist", version: "1" })
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  private assertOwnership(user: AuthenticatedUser | undefined, claimedCustomerId?: string): void {
    if (user && claimedCustomerId && user.id !== claimedCustomerId) {
      throw new ForbiddenException("The wishlist customerId must match the authenticated customer.");
    }
  }

  @Public()
  @Get()
  get(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
    @Query("customerId") customerId?: string,
  ) {
    this.assertOwnership(user, customerId);
    return this.wishlist.getWishlist({ sessionId, customerId });
  }

  @Public()
  @Post("items")
  addItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { sessionId?: string; customerId?: string; variantId: string },
  ) {
    this.assertOwnership(user, body.customerId);
    return this.wishlist.addItem(body, body.variantId);
  }

  @Public()
  @Post("share")
  share(@CurrentUser() user: AuthenticatedUser | undefined, @Body("customerId") customerId: string) {
    this.assertOwnership(user, customerId);
    return this.wishlist.generateShareLink(customerId);
  }

  @Public()
  @Get("shared/:token")
  getShared(@Param("token") token: string) {
    return this.wishlist.getSharedWishlist(token);
  }
}
