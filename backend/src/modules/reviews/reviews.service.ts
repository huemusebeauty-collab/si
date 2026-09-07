import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ReviewEntity } from "./entities/review.entity";
import { ReviewReplyEntity } from "./entities/review-reply.entity";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";
import { SettingsService } from "@/admin/settings/settings.service";

// Sprint 3.5 — ReviewService, method signatures per Phase 16 §16.9.
// Sprint 4.7 — Review System: moderation-status validation added (an
// already-approved review can't be "approved" again; a review must be
// pending to be approved). Rating aggregates (Phase 16 §16.9: "recalculate
// whenever a review's status changes to or from approved") are computed
// live in getReviewsForProduct on every call rather than stored and
// separately recalculated — by construction this is always current, so
// no explicit recompute-on-transition step is needed; documented here
// as a deliberate design choice, not an oversight.
// "Only customers with a confirmed Order containing the reviewed SKU
// may submit a Verified Purchase review" — verifiedPurchase remains a
// placeholder defaulting false (Sprint 4.7's own deliverable wording:
// "Verified Purchase placeholder") — wiring the actual Orders
// cross-check is still a documented Sprint 5+ completion.
@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity) private readonly reviews: Repository<ReviewEntity>,
    @InjectRepository(ReviewReplyEntity) private readonly replies: Repository<ReviewReplyEntity>,
    private readonly settings: SettingsService,
  ) {}

  // submitReview(customerId, skuId, rating, text, media?) -> Review (status: pending)
  // Sprint 7.4 — `verifiedPurchase` was previously hardcoded `false`
  // with no path to ever set it `true` anywhere in the codebase (a real
  // gap: Phase 16 §16.9 names "verified purchase" as a review concept,
  // but nothing ever computed or set it). Added as an optional param
  // here — real customer-facing review submission still defaults to
  // `false` (a genuine verification check, e.g. "did this customer
  // order this exact variant," is Known Issues, a Sprint 8+ addition);
  // SeedReviewsProvider is the first real caller to pass `true`, after
  // checking the seeded customer's own order history.
  // Sprint 7.5 — a submitted `mediaUrl` is now dropped (not rejected —
  // the review itself still submits fine) if
  // "reviews.mediaUploadsEnabled" is off, the second real feature-flag
  // integration this sprint adds.
  async submitReview(
    customerId: string,
    variantId: string,
    rating: number,
    text: string,
    mediaUrl?: string,
    verifiedPurchase = false,
  ): Promise<ReviewEntity> {
    const mediaUploadsEnabled = await this.settings.isFeatureEnabled("reviews.mediaUploadsEnabled");
    const review = this.reviews.create({
      customerId,
      variantId,
      rating,
      text,
      mediaUrl: mediaUploadsEnabled ? mediaUrl : undefined,
      status: "pending",
      verifiedPurchase,
    });
    return this.reviews.save(review);
  }

  // Sprint 7.4.7 — Idempotent Seeding: natural key for a review is
  // (customerId, variantId) — one review per customer per product,
  // same assumption the real storefront UI would enforce (not
  // currently enforced server-side either — Known Issues, since
  // nothing before this sprint needed to check for an existing review
  // prior to insertion).
  async existsForCustomerAndVariant(customerId: string, variantId: string): Promise<boolean> {
    const existing = await this.reviews.findOne({ where: { customerId, variantId } });
    return Boolean(existing);
  }

  private async findOrThrow(reviewId: string): Promise<ReviewEntity> {
    const review = await this.reviews.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("Review not found.");
    return review;
  }

  // approveReview(reviewId, adminId) -> Review (status: approved)
  // Sprint 4.7 — must currently be pending; an already-approved or
  // already-hidden review can't be re-approved through this method
  // (hide-then-approve is a legitimate two-step flow if ever needed,
  // but "approve" itself only makes sense from "pending").
  async approveReview(reviewId: string, _adminId: string): Promise<ReviewEntity> {
    const review = await this.findOrThrow(reviewId);
    if (review.status !== "pending") {
      throw new DomainException(
        DomainErrorCode.REVIEW_NOT_PENDING,
        `Only pending reviews can be approved (this review is "${review.status}").`,
      );
    }
    review.status = "approved";
    return this.reviews.save(review);
  }

  // hideReview(reviewId, adminId) -> Review (status: hidden)
  // Sprint 4.7 — hiding is allowed from either pending or approved
  // (an admin suppressing a review doesn't require it to have been
  // shown first), but not from an already-hidden review (no-op guard).
  async hideReview(reviewId: string, _adminId: string): Promise<ReviewEntity> {
    const review = await this.findOrThrow(reviewId);
    if (review.status === "hidden") {
      throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, "This review is already hidden.");
    }
    review.status = "hidden";
    return this.reviews.save(review);
  }

  // deleteReview(reviewId, adminId) -> {success}
  async deleteReview(reviewId: string, _adminId: string): Promise<{ success: true }> {
    await this.reviews.delete(reviewId);
    return { success: true };
  }

  // replyToReview(reviewId, adminId, replyText) -> ReviewReply
  async replyToReview(reviewId: string, adminId: string, replyText: string): Promise<ReviewReplyEntity> {
    const review = await this.findOrThrow(reviewId);
    return this.replies.save(this.replies.create({ review, adminId, text: replyText }));
  }

  // getReviewsForProduct(skuId) -> {summary, reviews[]}
  // Phase 16 §16.9: pending reviews excluded until approved. Summary is
  // computed live from currently-approved reviews (see class comment).
  async getReviewsForProduct(variantId: string): Promise<{ summary: { average: number; count: number }; reviews: ReviewEntity[] }> {
    const reviews = await this.reviews.find({
      where: { variantId, status: "approved" },
      relations: ["replies"],
      order: { createdAt: "DESC" },
    });
    const count = reviews.length;
    const average = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
    return { summary: { average: Math.round(average * 10) / 10, count }, reviews };
  }

  // Sprint 6 — Admin Dashboard KPI (Phase 6 §1: "Pending Reviews").
  async getPendingCount(): Promise<number> {
    return this.reviews.count({ where: { status: "pending" } });
  }

  // Sprint 6 — Admin Reviews Management: search/filter (Phase 6 §14 —
  // rating, approval status) and listing for the moderation queue.
  async adminList(filters: { status?: ReviewEntity["status"]; page: number; pageSize: number }) {
    const qb = this.reviews.createQueryBuilder("review").orderBy("review.createdAt", "DESC");
    if (filters.status) qb.andWhere("review.status = :status", { status: filters.status });
    const [items, totalItems] = await qb
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize)
      .getManyAndCount();
    return { items, totalItems };
  }

  // Sprint 6 — Bulk operations: reuses approveReview/hideReview's own
  // status-transition validation per item, rather than reimplementing it.
  async bulkApprove(reviewIds: string[], adminId: string): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of reviewIds) {
      try {
        await this.approveReview(id, adminId);
        succeeded.push(id);
      } catch (error) {
        failed.push({ id, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    return { succeeded, failed };
  }
}
