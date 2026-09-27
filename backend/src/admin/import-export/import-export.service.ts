import { Injectable } from "@nestjs/common";
import { toCsv, fromCsv } from "./csv.util";
import { ProductsService } from "@/modules/products/products.service";
import { CategoriesService } from "@/modules/categories/categories.service";

// Sprint 6 — Import/Export. Product-focused (the domain with the
// clearest "bulk maintain a catalog via spreadsheet" use case per
// Phase 6 §2's product management scope); Orders/Customers export is
// a documented Known Issue rather than built this sprint, to keep
// scope bounded. Routes through ProductsService/CategoriesService
// rather than injecting ProductEntity's repository directly (Phase 8
// §3 boundary rule) — caught and fixed during this sprint's own review.
@Injectable()
export class ImportExportService {
  constructor(
    private readonly products: ProductsService,
    private readonly categories: CategoriesService,
  ) {}

  async exportProductsCsv(): Promise<string> {
    const products = await this.products.listAllForExport();
    return toCsv(
      products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category.slug,
        price: p.price,
        status: p.status,
        visibility: p.visibility,
      })),
    );
  }

  // Sprint 6 — bulk create/update via CSV. Row-by-row, tolerant of
  // partial failure (one bad row doesn't abort the whole import) —
  // same succeeded/failed shape as the bulk-operation endpoints, for a
  // consistent admin UX pattern across both bulk mechanisms.
  async importProductsCsv(csv: string): Promise<{ succeeded: number; failed: { row: number; reason: string }[] }> {
    let rows: Record<string, string>[];
    try {
      rows = fromCsv(csv);
    } catch (error) {
      return {
        succeeded: 0,
        failed: [{ row: 1, reason: error instanceof Error ? error.message : String(error) }],
      };
    }

    if (rows.length === 0) {
      return {
        succeeded: 0,
        failed: [{ row: 1, reason: "CSV must contain a header row and at least one product row." }],
      };
    }

    const requiredHeaders = ["slug", "name", "category", "price"];
    const missingHeaders = requiredHeaders.filter((header) => !(header in rows[0]));
    if (missingHeaders.length > 0) {
      return {
        succeeded: 0,
        failed: [{ row: 1, reason: "Missing required column(s): " + missingHeaders.join(", ") + "." }],
      };
    }

    let succeeded = 0;
    const failed: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const slug = row.slug?.trim();
        const name = row.name?.trim();
        const categorySlug = row.category?.trim();
        const rawPrice = row.price?.trim();

        if (!slug) throw new Error("Slug is required.");
        if (!name) throw new Error("Product name is required.");
        if (!categorySlug) throw new Error("Category is required.");
        if (!rawPrice) throw new Error("Price is required.");

        const price = Number(rawPrice);
        if (!Number.isFinite(price) || price <= 0) throw new Error("Price must be a positive number.");

        const category = await this.categories.getCategory(categorySlug);
        await this.products.upsertFromImportRow(
          { slug, name, categorySlug, price: price.toFixed(2) },
          category,
        );
        succeeded += 1;
      } catch (error) {
        failed.push({ row: i + 2, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    return { succeeded, failed };
  }}
