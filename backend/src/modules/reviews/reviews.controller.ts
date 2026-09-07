import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import { SubmitReviewDto } from "./dto/submit-review.dto";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

@ApiTags("reviews")
@Controller({ path: "reviews", version: "1" })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get("product/:variantId")
  getForProduct(@Param("variantId") variantId: string) {
    return this.reviews.getReviewsForProduct(variantId);
  }

  @ApiBearerAuth()
  @Post()
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitReviewDto) {
    return this.reviews.submitReview(user.id, dto.variantId, dto.rating, dto.text, dto.mediaUrl);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Post(":reviewId/approve")
  approve(@CurrentUser() user: AuthenticatedUser, @Param("reviewId") reviewId: string) {
    return this.reviews.approveReview(reviewId, user.id);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Post(":reviewId/hide")
  hide(@CurrentUser() user: AuthenticatedUser, @Param("reviewId") reviewId: string) {
    return this.reviews.hideReview(reviewId, user.id);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Delete(":reviewId")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("reviewId") reviewId: string) {
    return this.reviews.deleteReview(reviewId, user.id);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Post(":reviewId/reply")
  reply(@CurrentUser() user: AuthenticatedUser, @Param("reviewId") reviewId: string, @Body("text") text: string) {
    return this.reviews.replyToReview(reviewId, user.id, text);
  }

  // Sprint 6B — Admin Reviews Management: moderation queue list
  // (completing the gap Sprint 6A left service-layer only).
  @RequirePermission("reviews", "view")
  @Get("admin/list")
  adminList(@Query("status") status?: "pending" | "approved" | "hidden", @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.reviews.adminList({ status, page: Number(page), pageSize: Number(pageSize) });
  }

  @RequirePermission("reviews", "edit")
  @Post("admin/bulk-approve")
  bulkApprove(@CurrentUser() user: AuthenticatedUser, @Body("reviewIds") reviewIds: string[]) {
    return this.reviews.bulkApprove(reviewIds, user.id);
  }
}