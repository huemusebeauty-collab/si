import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, LessThan, Repository } from "typeorm";
import { randomInt, createHash } from "crypto";
import { OtpEntity } from "./entities/otp.entity";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";
import { HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const MAX_VERIFY_ATTEMPTS = 5;

// Sprint 5.5 — OTP generation/verification/expiry/rate limiting.
// Deliberately separate from AuthService (Sprint 3) even though it
// enables the "Login OTP" flow — OTP mechanics (code generation,
// hashing, expiry, rate limiting) are a generic capability SmsService
// exposes for any purpose (login, order verification, ...), not
// auth-specific business logic; AuthModule composes this in rather than owning it, keeping the two concerns cleanly separated.
@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpEntity) private readonly otps: Repository<OtpEntity>,
    private readonly config: ConfigService,
  ) {}

  private hashCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  // Sprint 5.5 — rate limiting: at most N OTP requests per phone number
  // per hour (config: sms.otpRateLimitPerHour), regardless of purpose.
  private async assertNotRateLimited(phoneNumber: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.otps.count({ where: { phoneNumber, createdAt: MoreThan(oneHourAgo) } });
    const limit = this.config.get<number>("sms.otpRateLimitPerHour") ?? 5;
    if (recentCount >= limit) {
      throw new DomainException(
        DomainErrorCode.RATE_LIMITED,
        `Too many OTP requests for this number. Please wait before requesting another.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async generate(phoneNumber: string, purpose: string): Promise<string> {
    await this.assertNotRateLimited(phoneNumber);
    const code = randomInt(100000, 999999).toString();
    const ttlSeconds = this.config.get<number>("sms.otpTtlSeconds") ?? 300;
    await this.otps.save(
      this.otps.create({
        phoneNumber,
        codeHash: this.hashCode(code),
        purpose,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      }),
    );
    return code; // caller (SmsService) is responsible for actually sending it — OtpService never sends SMS itself
  }

  async verify(phoneNumber: string, purpose: string, code: string): Promise<boolean> {
    const otp = await this.otps.findOne({
      where: { phoneNumber, purpose, consumed: false },
      order: { createdAt: "DESC" },
    });
    if (!otp) return false;

    if (otp.expiresAt < new Date()) return false;
    if (otp.attemptCount >= MAX_VERIFY_ATTEMPTS) return false;

    otp.attemptCount += 1;
    const isMatch = otp.codeHash === this.hashCode(code);
    if (isMatch) {
      otp.consumed = true;
    }
    await this.otps.save(otp);
    return isMatch;
  }

  // Sprint 5.8 — called by ScheduledJobsService rather than that job
  // injecting OtpEntity's repository directly, keeping the same
  // module-boundary discipline established in Sprint 4 (a scheduled job
  // is still a "caller" like any controller/service, not a repository-
  // access exemption).
  async purgeExpired(): Promise<number> {
    const result = await this.otps.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
