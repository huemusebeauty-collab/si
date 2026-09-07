import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { getDataSourceToken } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";
import { SeedAppModule } from "./seed-app.module";
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

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`Bootstrapping application context (dry-run: ${dryRun})...`);

  const app = await NestFactory.createApplicationContext(SeedAppModule, { logger: ["error", "warn"] });
  const dataSource = app.get<DataSource>(getDataSourceToken());

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
    console.log("Seeded 1 Super Admin account.");
  }

  const providersModuleRef = app.select(SeedProvidersModule);
  const engine = providersModuleRef.get(SeedEngineService, { strict: false });

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
    console.warn(`${summary.totals.rejectedInvalid} entities were rejected by the Content Validation Engine.`);
  }

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
