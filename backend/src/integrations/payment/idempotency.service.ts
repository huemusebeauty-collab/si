import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { IdempotencyKeyEntity } from "./entities/idempotency-key.entity";

// Sprint 5.2 — generic enough to reuse for SMS/webhook idempotency too
// (see WebhooksService's replay protection, which uses the same
// pattern against a different entity for a different reason — request-
// idempotency vs. webhook-replay-protection are related but distinct
// concerns, kept as separate entities/services rather than conflated).
@Injectable()
export class IdempotencyService {
  constructor(@InjectRepository(IdempotencyKeyEntity) private readonly keys: Repository<IdempotencyKeyEntity>) {}

  async getCachedResponse<T>(key: string, scope: string): Promise<T | null> {
    const existing = await this.keys.findOne({ where: { key, scope } });
    return existing ? (existing.responseBody as T) : null;
  }

  async storeResponse<T>(key: string, scope: string, responseBody: T): Promise<void> {
    await this.keys.save(this.keys.create({ key, scope, responseBody }));
  }

  // Sprint 5.2 — wraps an operation so callers don't have to hand-write
  // the check-then-store pattern at every call site.
  async runOnce<T>(key: string, scope: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.getCachedResponse<T>(key, scope);
    if (cached !== null) return cached;
    const result = await fn();
    await this.storeResponse(key, scope, result);
    return result;
  }

  // Sprint 5.8 — called by ScheduledJobsService, same module-boundary
  // reasoning as OtpService.purgeExpired.
  async purgeStale(olderThan: Date): Promise<number> {
    const result = await this.keys.delete({ createdAt: LessThan(olderThan) });
    return result.affected ?? 0;
  }
}
