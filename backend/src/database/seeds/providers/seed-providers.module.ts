import { Module } from "@nestjs/common";
import { SeedEngineModule } from "../engine/seed-engine.module";
import { SettingsSeedProvider } from "./settings.provider";
import { CategoriesSeedProvider } from "./categories.provider";
import { CollectionsSeedProvider } from "./collections.provider";
import { ProductsSeedProvider } from "./products.provider";
import { CmsPagesSeedProvider } from "./cms-pages.provider";
import { FaqsSeedProvider } from "./faqs.provider";
import { BannersSeedProvider } from "./banners.provider";
import { CouponsSeedProvider } from "./coupons.provider";
import { CustomersSeedProvider } from "./customers.provider";
import { OrdersSeedProvider } from "./orders.provider";
import { ReviewsSeedProvider } from "./reviews.provider";
import { SettingsModule } from "@/admin/settings/settings.module";
import { CategoriesModule } from "@/modules/categories/categories.module";
import { CollectionsModule } from "@/modules/collections/collections.module";
import { ProductsModule } from "@/modules/products/products.module";
import { CmsModule } from "@/modules/cms/cms.module";
import { CouponsModule } from "@/admin/coupons/coupons.module";
import { CustomersModule } from "@/modules/customers/customers.module";
import { CartModule } from "@/modules/cart/cart.module";
import { OrdersModule } from "@/modules/orders/orders.module";
import { ReviewsModule } from "@/modules/reviews/reviews.module";
import { ContentValidationModule } from "@/admin/content-validation/content-validation.module";

// Sprint 7.4.5 — one module registering all 11 providers plus every
// domain module they depend on. Deliberately separate from
// SeedEngineModule (the generic orchestrator, which has zero knowledge
// of what a "product" or "order" is) — this module is the seed-specific
// wiring layer.
@Module({
  imports: [
    SeedEngineModule,
    SettingsModule,
    CategoriesModule,
    CollectionsModule,
    ProductsModule,
    CmsModule,
    CouponsModule,
    CustomersModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    ContentValidationModule,
  ],
  providers: [
    SettingsSeedProvider,
    CategoriesSeedProvider,
    CollectionsSeedProvider,
    ProductsSeedProvider,
    CmsPagesSeedProvider,
    FaqsSeedProvider,
    BannersSeedProvider,
    CouponsSeedProvider,
    CustomersSeedProvider,
    OrdersSeedProvider,
    ReviewsSeedProvider,
  ],
  exports: [
    SettingsSeedProvider,
    CategoriesSeedProvider,
    CollectionsSeedProvider,
    ProductsSeedProvider,
    CmsPagesSeedProvider,
    FaqsSeedProvider,
    BannersSeedProvider,
    CouponsSeedProvider,
    CustomersSeedProvider,
    OrdersSeedProvider,
    ReviewsSeedProvider,
    SeedEngineModule,
  ],
})
export class SeedProvidersModule {}
