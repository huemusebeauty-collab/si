import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { IdempotencyKeyEntity } from "./entities/idempotency-key.entity";

const PROCESSING_MARKER = "__idempotency_processing__";
const WAIT_INTERVAL_MS = 50;
const WAIT_TIMEOUT_MS = 30_000;
const STALE_CLAIM_MS = 5 * 60 * 1000;

@Injectable()
export class IdempotencyService {
  constructor(@InjectRepository(IdempotencyKeyEntity) private readonly keys: Repository<IdempotencyKeyEntity>) {}

  private storageKey(key: string, scope: string): string {
    // The entity currently has a single-column primary key. Namespacing the
    // stored key preserves that schema while preventing cross-scope collisions.
    return `${scope}:${key}`;
  }

  async getCachedResponse<T>(key: string, scope: string): Promise<T | null> {
    const stored = await this.keys.findOne({ where: { key: this.storageKey(key, scope) } });
    if (!stored || this.isProcessingMarker(stored.responseBody)) return null;
    return stored.responseBody as T;
  }

  async storeResponse<T>(key: string, scope: string, responseBody: T): Promise<void> {
    await this.keys.update(
      { key: this.storageKey(key, scope) },
      { responseBody },
    );
  }

  async runOnce<T>(key: string, scope: string, fn: () => Promise<T>): Promise<T> {
    const storageKey = this.storageKey(key, scope);
    const cached = await this.getCachedResponse<T>(key, scope);
    if (cached !== null) return cached;

    const claimed = await this.claim(storageKey);
    if (claimed) {
      try {
        const result = await fn();
        await this.storeResponse(key, scope, result);
        return result;
      } catch (error) {
        await this.keys.delete({ key: storageKey });
        throw error;
      }
    }

    const waited = await this.waitForResponse<T>(storageKey);
    if (waited !== null) return waited;

    // A stale claim is safe to retry because the payment provider receives the
    // same idempotency key. The database claim prevents normal concurrent
    // requests; stale recovery handles a crashed worker.
    const stale = await this.keys.delete({
      key: storageKey,
      createdAt: LessThan(new Date(Date.now() - STALE_CLAIM_MS)),
    });
    if (stale.affected) return this.runOnce(key, scope, fn);

    throw new Error("Idempotent operation did not complete within the retry window.");
  }

  private async claim(storageKey: string): Promise<boolean> {
    const result = await this.keys
      .createQueryBuilder()
      .insert()
      .into(IdempotencyKeyEntity)
      .values({ key: storageKey, scope: storageKey.split(":")[0], responseBody: { [PROCESSING_MARKER]: true } })
      .orIgnore()
      .execute();
    return (result.identifiers?.length ?? 0) > 0;
  }

  private async waitForResponse<T>(storageKey: string): Promise<T | null> {
    const deadline = Date.now() + WAIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const stored = await this.keys.findOne({ where: { key: storageKey } });
      if (!stored) return null;
      if (!this.isProcessingMarker(stored.responseBody)) return stored.responseBody as T;
      await new Promise((resolve) => setTimeout(resolve, WAIT_INTERVAL_MS));
    }
    return null;
  }

  private isProcessingMarker(value: unknown): boolean {
    return Boolean(
      value &&
      typeof value === "object" &&
      (value as Record<string, unknown>)[PROCESSING_MARKER] === true,
    );
  }

  async purgeStale(olderThan: Date): Promise<number> {
    return (await this.keys.delete({ createdAt: LessThan(olderThan) })).affected ?? 0;
  }
}
