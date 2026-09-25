import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createKeyv } from "@keyv/redis";

// Redis is optional for initial deployment. When REDIS_URL is missing or
// malformed, Nest uses its default in-memory cache. A valid redis:// or
// rediss:// URL enables the shared Redis cache through Keyv.
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
            stores: [createKeyv(url)],
            ttl: 60_000,
          };
        } catch {
          // Keep the API bootable if Redis configuration is invalid.
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
