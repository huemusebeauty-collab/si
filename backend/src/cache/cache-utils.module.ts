import { Global, Module } from "@nestjs/common";
import { CacheInvalidationService } from "./cache-invalidation.service";

// Sprint 4.11 — makes CacheInvalidationService injectable everywhere
// without every domain module needing to import RedisCacheModule
// directly (CACHE_MANAGER itself is already global via
// RedisCacheModule's `isGlobal: true` — this just gives the small
// invalidation helper the same reach).
@Global()
@Module({
  providers: [CacheInvalidationService],
  exports: [CacheInvalidationService],
})
export class CacheUtilsModule {}
