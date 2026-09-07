import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { redisStore } from "cache-manager-redis-yet";

// Sprint 3.2 — Core Infrastructure: Redis connection, per Phase 8 §2
// (session storage, cart state, frequently-read catalog caching).
// Sprint 3.11 builds the caching *framework* (interceptors/decorators)
// on top of this connection.
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          url: config.get<string>("redis.url"),
        }),
        ttl: 60_000, // default 60s; per-key overrides applied at call sites (Sprint 3.11)
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
