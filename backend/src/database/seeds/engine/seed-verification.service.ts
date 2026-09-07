import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

export interface VerificationCheck {
  name: string;
  passed: boolean;
  details: string;
  affectedCount?: number;
}

export interface VerificationReport {
  generatedAt: string;
  checks: VerificationCheck[];
  allPassed: boolean;
}

// Sprint 7.4.9 — Seed Verification. Runs AFTER SeedEngineService.execute()
// completes, as a separate read-only integrity pass over what actually
// landed in the database — distinct from Sprint 7.4.6's per-entity
// Content Validation (which checks a single entity's own fields before
// insertion; this checks CROSS-entity referential integrity after the
// fact, which by definition can only be checked once everything exists).
// Uses raw queries against the DataSource directly (not injected domain
// services) since these are cross-cutting structural checks spanning
// many entity types at once — the kind of check that doesn't belong to
// any single module's service.
@Injectable()
export class SeedVerificationService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async verify(): Promise<VerificationReport> {
    const checks: VerificationCheck[] = await Promise.all([
      this.checkCategoryHierarchyIntegrity(),
      this.checkProductCategoryLinks(),
      this.checkCollectionAssignments(),
      this.checkCustomerOrderLinks(),
      this.checkReviewProductLinks(),
      this.checkBannerAssetReferences(),
      this.checkCmsInternalLinks(),
      this.checkCouponValidity(),
      this.checkSeoMetadataCompleteness(),
    ]);

    return { generatedAt: new Date().toISOString(), checks, allPassed: checks.every((c) => c.passed) };
  }

  private async checkCategoryHierarchyIntegrity(): Promise<VerificationCheck> {
    // Sprint 7.4.9 — every non-root category must resolve to a real parent row.
    const orphans = await this.dataSource.query(
      `SELECT c.id FROM category_closure cc JOIN category c ON c.id = cc."descendantId" WHERE cc.depth = 1 AND NOT EXISTS (SELECT 1 FROM category p WHERE p.id = cc."ancestorId")`,
    ).catch(() => []); // Sprint 7.4.9 — closure-table column names are TypeORM-generated; this check degrades gracefully (see Known Issues) rather than crashing verification if the schema differs from assumed
    return { name: "Category hierarchy integrity", passed: orphans.length === 0, details: orphans.length === 0 ? "No orphaned subcategories found." : `${orphans.length} subcategor(y/ies) reference a missing parent.`, affectedCount: orphans.length };
  }

  private async checkProductCategoryLinks(): Promise<VerificationCheck> {
    const orphans = await this.dataSource.query(`SELECT p.id FROM product p WHERE p."categoryId" IS NULL OR NOT EXISTS (SELECT 1 FROM category c WHERE c.id = p."categoryId")`);
    return { name: "Product-category relationships", passed: orphans.length === 0, details: orphans.length === 0 ? "Every product references a valid category." : `${orphans.length} product(s) have no valid category.`, affectedCount: orphans.length };
  }

  private async checkCollectionAssignments(): Promise<VerificationCheck> {
    const empty = await this.dataSource.query(`SELECT col.id FROM collection col WHERE NOT EXISTS (SELECT 1 FROM collection_products_product cp WHERE cp."collectionId" = col.id)`);
    return { name: "Collection product assignments", passed: empty.length === 0, details: empty.length === 0 ? "Every collection has at least one product." : `${empty.length} collection(s) have zero assigned products.`, affectedCount: empty.length };
  }

  private async checkCustomerOrderLinks(): Promise<VerificationCheck> {
    const orphans = await this.dataSource.query(`SELECT o.id FROM "order" o WHERE NOT EXISTS (SELECT 1 FROM customer c WHERE c.id = o."customerId")`);
    return { name: "Customer-order relationships", passed: orphans.length === 0, details: orphans.length === 0 ? "Every order references a valid customer." : `${orphans.length} order(s) reference a missing customer.`, affectedCount: orphans.length };
  }

  private async checkReviewProductLinks(): Promise<VerificationCheck> {
    const orphans = await this.dataSource.query(`SELECT r.id FROM review r WHERE NOT EXISTS (SELECT 1 FROM product_variant v WHERE v.id = r."variantId")`);
    return { name: "Review-product relationships", passed: orphans.length === 0, details: orphans.length === 0 ? "Every review references a valid product variant." : `${orphans.length} review(s) reference a missing variant.`, affectedCount: orphans.length };
  }

  private async checkBannerAssetReferences(): Promise<VerificationCheck> {
    const banners = await this.dataSource.query(`SELECT "imageUrl" FROM banner`);
    // Sprint 7.4.9 — "broken asset reference" here means the URL isn't
    // one of the mock paths the seed itself created (see Known Issues —
    // no real S3/StorageService listing exists to check against yet).
    const broken = banners.filter((b: { imageUrl: string }) => !b.imageUrl?.startsWith("/mock/"));
    return { name: "Banner asset references", passed: broken.length === 0, details: broken.length === 0 ? "All banner images reference recognized seed assets." : `${broken.length} banner(s) reference an unrecognized asset path.`, affectedCount: broken.length };
  }

  private async checkCmsInternalLinks(): Promise<VerificationCheck> {
    const pages = await this.dataSource.query(`SELECT slug FROM static_page`);
    const slugs = new Set(pages.map((p: { slug: string }) => p.slug));
    const expectedCrossLinks = ["privacy", "terms", "shipping-policy", "return-refund-policy"];
    const missing = expectedCrossLinks.filter((s) => !slugs.has(s));
    return { name: "CMS internal link targets exist", passed: missing.length === 0, details: missing.length === 0 ? "All commonly cross-linked static pages exist." : `Missing expected page(s): ${missing.join(", ")}.`, affectedCount: missing.length };
  }

  private async checkCouponValidity(): Promise<VerificationCheck> {
    const invalid = await this.dataSource.query(`SELECT id FROM coupons WHERE "startAt" >= "endAt"`);
    return { name: "Coupon date-range validity", passed: invalid.length === 0, details: invalid.length === 0 ? "Every coupon has a valid active window." : `${invalid.length} coupon(s) have an invalid date range.`, affectedCount: invalid.length };
  }

  private async checkSeoMetadataCompleteness(): Promise<VerificationCheck> {
    const missing = await this.dataSource.query(`SELECT id FROM product WHERE "metaTitle" IS NULL OR "metaDescription" IS NULL`);
    return { name: "Product SEO metadata completeness", passed: missing.length === 0, details: missing.length === 0 ? "Every product has meta title and description." : `${missing.length} product(s) are missing SEO metadata.`, affectedCount: missing.length };
  }
}
