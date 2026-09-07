import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { getDataSourceToken } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";
import { AppModule } from "@/app.module";
import { SeedProvidersModule } from "./providers/seed-providers.module";
import { SeedEngineService } from "./engine/seed-engine.service";
import { SeedVerificationService } from "./engine/seed-verification.service";
import { SettingsSeedProvider } from "./providers/settings.provider";
import { CategoriesSeedProvider } from "./providers/categories.provider";
import { CollectionsSeedProvider } from "./providers/collections.provider";
import { ProductsSeedProvider } from "./providers/products.provider";
import { CmsPagesSeedProvider } from "./providers/cms-pages.provider";
import { FaqsSeedProvider } from "./providers/faqs.provider";
import { BannersSeedProvider } from "./providers/banners.provider";
import { CouponsSeedProvider } from "./providers/coupons.provider";
import { CustomersSeedProvider } from "./providers/customers.provider";
import { OrdersSeedProvider } from "./providers/orders.provider";
import { ReviewsSeedProvider } from "./providers/reviews.provider";
import { AdminUserEntity } from "@/admin/auth/entities/admin-user.entity";
import { AdminRole } from "@/admin/common/admin-role";
import { hashPassword } from "@/modules/auth/password.util";

// Sprint 7.4.5 — the seed script is now a real NestJS application
// context (`NestFactory.createApplicationContext`), not a standalone
// script against a raw TypeORM DataSource (Sprint 3-6's approach).
// This is a deliberate architectural upgrade: every seed provider
// injects and calls the SAME domain services (ProductsService,
// ContentValidationService, etc.) the running API uses — seeding
// genuinely exercises the real business logic and the real Content
// Validation Engine, not a parallel reimplementation. The tradeoff,
// disclosed here and in SEED_ENGINE.md: bootstrapping the full
// AppModule also starts BullMQ queue connections and Sprint 5.8's
// scheduled cron jobs for the duration of the script — harmless for a
// one-off seed run, but worth knowing if this is ever wrapped in a
// tighter CI job.
async function run() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`Bootstrapping application context (dry-run: ${dryRun})...`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  const dataSource = app.get<DataSource>(getDataSourceToken());

  // Sprint 7.4 — the first Super Admin account remains a direct
  // bootstrap step, not a SeedProvider: every other provider's write
  // paths are gated by admin-permission-checked services in principle,
  // and more concretely, AdminUserEntity has no natural content-
  // validation shape (it's a credential, not editorial/catalog
  // content) — it was never one of Sprint 7.3's 8 supported content
  // types, so it stays outside the engine, same reasoning as Coupons'
  // simplified inline validation.
  const adminRepo = dataSource.getRepository(AdminUserEntity);
  const existingAdmin = await adminRepo.findOne({ where: { email: "admin@huemusebeauty.local" } });
  if (!existingAdmin && !dryRun) {
    await adminRepo.save(
      adminRepo.create({
        email: "admin@huemusebeauty.local",
        passwordHash: await hashPassword("ChangeMe123!"),
        firstName: "Super",
        lastName: "Admin",
        role: AdminRole.SUPER_ADMIN,
        active: true,
      }),
    );
    console.log("Seeded 1 Super Admin account (admin@huemusebeauty.local / ChangeMe123! — change immediately in any non-local environment).");
  }

  const providersModuleRef = app.select(SeedProvidersModule);
  const engine = providersModuleRef.get(SeedEngineService, { strict: false });

  // Sprint 7.4.5 — "Register seed providers": in the exact execution
  // order Sprint 7.4.5 specifies (1. Settings ... 11. Reviews) — the
  // engine's own topological sort will re-derive and enforce this same
  // order from `dependsOn`, so this registration order is documentation
  // for a human reader, not load-bearing for correctness.
  for (const ProviderClass of [
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
  ]) {
    engine.register(providersModuleRef.get(ProviderClass, { strict: false }));
  }

  const summary = await engine.execute(dryRun);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.fatalError) {
    console.error(`Seed run failed: ${summary.fatalError}`);
    if (summary.rolledBack) console.error("All completed providers were rolled back.");
    await app.close();
    process.exit(1);
  }

  console.log(
    `Seed complete — created: ${summary.totals.created}, updated: ${summary.totals.updated}, ` +
      `skipped (unchanged): ${summary.totals.skippedUnchanged}, rejected (invalid): ${summary.totals.rejectedInvalid}.`,
  );

  if (!dryRun && summary.totals.rejectedInvalid > 0) {
    console.warn(`${summary.totals.rejectedInvalid} entities were rejected by the Content Validation Engine — see report above for details.`);
  }

  // Sprint 7.4.9 — Seed Verification: runs automatically after a real
  // (non-dry-run) seed completes.
  if (!dryRun) {
    const verification = providersModuleRef.get(SeedVerificationService, { strict: false });
    const verificationReport = await verification.verify();
    console.log("=== Verification Report ===");
    console.log(JSON.stringify(verificationReport, null, 2));
    if (!verificationReport.allPassed) {
      console.warn("One or more verification checks failed — review the report above.");
    }
  }

  await app.close();
}

run().catch((error) => {
  console.error("Seed script crashed:", error);
  process.exit(1);
});
