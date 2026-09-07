import { SetMetadata } from "@nestjs/common";

// Sprint 3.11 — Performance Foundation: Redis caching framework.
// Marks a controller method as cacheable; CacheInterceptor (below) reads
// this metadata. Per Phase 8 §8 / Phase 16 §16.15: "frequently-read,
// rarely-changed data (product listings, category structure) cached,
// invalidated on the relevant write."
export const CACHEABLE_KEY = "cacheable";
export interface CacheableOptions {
  ttlSeconds: number;
  keyPrefix: string;
}
export const Cacheable = (options: CacheableOptions) => SetMetadata(CACHEABLE_KEY, options);
