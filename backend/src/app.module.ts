import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import configuration from "./config/configuration";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { RedisCacheModule } from "./cache/redis.module";
import { CacheUtilsModule } from "./cache/cache-utils.module";

import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { HttpCacheInterceptor } from "./cache/cache.interceptor";

import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "./modules/auth/guards/roles.guard";
import { CustomersModule } from "./modules/customers/customers.module";
import { ProductsModule } from "./modules/products/products.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { CollectionsModule } from "./modules/collections/collections.module";
import { CartModule } from "./modules/cart/cart.module";
import { WishlistModule } from "./modules/wishlist/wishlist.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { CmsModule } from "./modules/cms/cms.module";
import { StorageModule } from "./modules/storage/storage.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { AdminModule } from "./admin/admin.module";

// Sprint 3.1 — root module wiring every core-infrastructure and domain
// module. Order below follows Sprint 3's deliverable numbering
// (3.2 infra -> 3.3 auth -> 3.5 domain modules -> 3.8 storage) for
// readability, though NestJS module resolution doesn't depend on order.
@Module({
  imports: [
    // Sprint 3.1/3.2 — Core Infrastructure
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        autoLogging: false, // RequestLoggingInterceptor owns per-request logging (Sprint 3.6)
      },
    }),
    DatabaseModule,
    RedisCacheModule,
    CacheUtilsModule,
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 100, // Sprint 3.7 — global default; tighter per-endpoint limits set via @Throttle()
      },
    ]),

    // Sprint 3.2 — health checks
    HealthModule,

    // Sprint 3.3 — Authentication Foundation
    AuthModule,

    // Sprint 3.5 — Core Domain Modules
    CustomersModule,
    ProductsModule,
    CategoriesModule,
    CollectionsModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    ReviewsModule,
    CmsModule,

    // Sprint 3.8 — File Storage
    StorageModule,

    // Sprint 5 — Third-Party Integrations & External Services
    IntegrationsModule,

    // Sprint 6 — Admin Panel & CMS Operations
    AdminModule,
  ],
  providers: [
    // Sprint 3.7 — Security: every route requires auth by default
    // (opt-out via @Public()), then role-checked, then rate-limited.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Sprint 3.6 — API Foundation: global error shape + response envelope + logging
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    // Sprint 3.11 — Performance: caches @Cacheable()'d GET endpoints;
    // no-ops for every endpoint that doesn't opt in, so it's safe as a
    // global interceptor rather than needing per-controller wiring.
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule {}
