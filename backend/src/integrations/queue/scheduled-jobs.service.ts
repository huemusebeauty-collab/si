import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OtpService } from "@/integrations/sms/otp.service";
import { IdempotencyService } from "@/integrations/payment/idempotency.service";

// Sprint 5.8 — Scheduled Jobs. Two housekeeping jobs, chosen because
// they're low-risk, self-contained, and don't depend on any live
// provider: expired OTPs and idempotency keys older than their useful
// lifetime are periodically purged so these tables don't grow
// unbounded. Routes through OtpService/IdempotencyService rather than
// injecting their repositories directly (same module-boundary
// discipline established in Sprint 4's structural audits).
//
// A payment-status reconciliation job (periodically calling
// PaymentService.syncStatus for every pending transaction) is the
// natural next scheduled job — documented in Known Issues rather than
// added here, to keep this module's dependency graph simple for
// Sprint 5's scope.
@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger("ScheduledJobs");

  constructor(
    private readonly otp: OtpService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredOtps(): Promise<void> {
    const count = await this.otp.purgeExpired();
    this.logger.log(`Purged ${count} expired OTP code(s).`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeStaleIdempotencyKeys(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const count = await this.idempotency.purgeStale(cutoff);
    this.logger.log(`Purged ${count} stale idempotency key(s).`);
  }
}
