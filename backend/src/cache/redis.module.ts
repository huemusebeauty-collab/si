import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { redisStore } from "cache-manager-redis-yet";

// Redis is optional for initial deployment. When REDIS_URL is missing or
// malformed, Nest falls back to its default in-memory cache instead of
// crashing the whole API during startup. A valid redis:// or rediss:// URL
// enables the shared Redis cache.
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>("redis.url")?.trim();

        if (!url || !/^rediss?:\/\//i.test(url)) {
          return {
            ttl: 60_000,
          };
        }

        try {
          return {
            store: await redisStore({ url }),
            ttl: 60_000,
          };
        } catch {
          // Keep the API bootable if Redis is temporarily unavailable or the
          // configured URL is invalid. Redis can be enabled later via env.
          return {
            ttl: 60_000,
          };
        }
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
