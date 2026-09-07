import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ReviewsService } from "./reviews.service";
import { ReviewEntity } from "./entities/review.entity";
import { ReviewReplyEntity } from "./entities/review-reply.entity";
import { DomainException } from "@/common/exceptions/domain.exception";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    create: jest.fn((e: unknown) => e),
    delete: jest.fn(),
  };
}

// Sprint 4.12/4.7 — Business Rule Tests: review moderation-status
// validation, new in Sprint 4 (Sprint 3's approve/hide had no gating).
describe("ReviewsService — moderation rules", () => {
  let service: ReviewsService;
  let reviewRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    reviewRepo = createMockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewRepo },
        { provide: getRepositoryToken(ReviewReplyEntity), useValue: createMockRepo() },
      ],
    }).compile();
    service = module.get(ReviewsService);
  });

  it("approves a pending review", async () => {
    reviewRepo.findOne.mockResolvedValue({ id: "r1", status: "pending" });
    const result = await service.approveReview("r1", "admin1");
    expect(result.status).toBe("approved");
  });

  it("rejects approving an already-approved review", async () => {
    reviewRepo.findOne.mockResolvedValue({ id: "r1", status: "approved" });
    await expect(service.approveReview("r1", "admin1")).rejects.toThrow(DomainException);
  });

  it("allows hiding a pending review", async () => {
    reviewRepo.findOne.mockResolvedValue({ id: "r1", status: "pending" });
    const result = await service.hideReview("r1", "admin1");
    expect(result.status).toBe("hidden");
  });

  it("rejects hiding an already-hidden review", async () => {
    reviewRepo.findOne.mockResolvedValue({ id: "r1", status: "hidden" });
    await expect(service.hideReview("r1", "admin1")).rejects.toThrow(DomainException);
  });

  it("computes the aggregate average only from approved reviews", async () => {
    reviewRepo.find.mockResolvedValue([
      { id: "r1", rating: 5, status: "approved" },
      { id: "r2", rating: 3, status: "approved" },
    ]);
    const result = await service.getReviewsForProduct("v1");
    expect(result.summary.average).toBe(4);
    expect(result.summary.count).toBe(2);
  });
});
