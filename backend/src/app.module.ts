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
import { WebsiteEventsModule } from "./modules/website-events/website-events.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        autoLogging: false,
      },
    }),
    DatabaseModule,
    RedisCacheModule,
    CacheUtilsModule,
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 100,
      },
    ]),
    HealthModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    CategoriesModule,
    CollectionsModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    ReviewsModule,
    CmsModule,
    StorageModule,
    IntegrationsModule,
    AdminModule,
    WebsiteEventsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule {}
