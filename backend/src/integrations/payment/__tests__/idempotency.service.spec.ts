import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { IdempotencyService } from "../idempotency.service";
import { IdempotencyKeyEntity } from "../entities/idempotency-key.entity";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    create: jest.fn((e: unknown) => e),
    delete: jest.fn(),
  };
}

// Sprint 5.10/5.2 — Idempotency handling: the core guarantee is that a
// repeated call with the same key does NOT re-execute the operation.
describe("IdempotencyService.runOnce", () => {
  let service: IdempotencyService;
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    repo = createMockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdempotencyService, { provide: getRepositoryToken(IdempotencyKeyEntity), useValue: repo }],
    }).compile();
    service = module.get(IdempotencyService);
  });

  it("executes the operation on first call", async () => {
    repo.findOne.mockResolvedValue(null);
    const fn = jest.fn().mockResolvedValue({ result: "first" });
    const result = await service.runOnce("key1", "test:scope", fn);
    expect(result).toEqual({ result: "first" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT re-execute the operation on a repeated key — returns the cached response", async () => {
    repo.findOne.mockResolvedValue({ key: "key1", scope: "test:scope", responseBody: { result: "cached" } });
    const fn = jest.fn().mockResolvedValue({ result: "should never run" });
    const result = await service.runOnce("key1", "test:scope", fn);
    expect(result).toEqual({ result: "cached" });
    expect(fn).not.toHaveBeenCalled();
  });
});
