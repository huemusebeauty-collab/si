import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import type { Cache } from "cache-manager";

// Sprint 3.11 — Performance Foundation: "invalidated on the relevant
// write (e.g., product update triggers cache invalidation for that
// product's cache entries)." Sprint 3 scope: prefix-based invalidation
// (clear every cached response under a module's keyPrefix) rather than
// surgical per-entity invalidation — sufficient for a foundation stage
// where write volume is low; documented as a Sprint 4+ refinement in
// Known Issues if write-heavy modules need finer granularity.
@Injectable()
export class CacheInvalidationService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async invalidatePrefix(keyPrefix: string): Promise<void> {
    const store = this.cache.store as unknown as { keys?: (pattern: string) => Promise<string[]> };
    if (typeof store.keys !== "function") return;
    const keys = await store.keys(`${keyPrefix}:*`);
    await Promise.all(keys.map((key) => this.cache.del(key)));
  }
}
