import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { OtpService } from "../otp.service";
import { OtpEntity } from "../entities/otp.entity";
import { DomainException } from "@/common/exceptions/domain.exception";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    create: jest.fn((e: unknown) => e),
    count: jest.fn(),
    delete: jest.fn(),
  };
}

// Sprint 5.10/5.5 — OTP rate limiting and verification-attempt limiting.
describe("OtpService", () => {
  let service: OtpService;
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    repo = createMockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getRepositoryToken(OtpEntity), useValue: repo },
        { provide: ConfigService, useValue: { get: (key: string) => (key === "sms.otpRateLimitPerHour" ? 5 : key === "sms.otpTtlSeconds" ? 300 : undefined) } },
      ],
    }).compile();
    service = module.get(OtpService);
  });

  it("generates a 6-digit code", async () => {
    repo.count.mockResolvedValue(0);
    const code = await service.generate("+15551234567", "login");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("rejects generation once the hourly rate limit is reached", async () => {
    repo.count.mockResolvedValue(5); // at the configured limit
    await expect(service.generate("+15551234567", "login")).rejects.toThrow(DomainException);
  });

  it("verifies a correct code against its stored hash", async () => {
    repo.count.mockResolvedValue(0);
    let savedOtp: { codeHash: string; attemptCount: number; expiresAt: Date } | undefined;
    repo.save.mockImplementation((e: typeof savedOtp) => {
      savedOtp = e;
      return Promise.resolve(e);
    });
    const code = await service.generate("+15551234567", "login");

    repo.findOne.mockResolvedValue(savedOtp);
    const isValid = await service.verify("+15551234567", "login", code);
    expect(isValid).toBe(true);
  });

  it("rejects an incorrect code", async () => {
    repo.count.mockResolvedValue(0);
    let savedOtp: { codeHash: string; attemptCount: number; expiresAt: Date } | undefined;
    repo.save.mockImplementation((e: typeof savedOtp) => {
      savedOtp = e;
      return Promise.resolve(e);
    });
    await service.generate("+15551234567", "login");

    repo.findOne.mockResolvedValue(savedOtp);
    const isValid = await service.verify("+15551234567", "login", "000000");
    expect(isValid).toBe(false);
  });

  it("rejects an expired code even if correct", async () => {
    repo.findOne.mockResolvedValue({
      codeHash: "irrelevant",
      attemptCount: 0,
      expiresAt: new Date(Date.now() - 1000), // already expired
    });
    const isValid = await service.verify("+15551234567", "login", "123456");
    expect(isValid).toBe(false);
  });
});
