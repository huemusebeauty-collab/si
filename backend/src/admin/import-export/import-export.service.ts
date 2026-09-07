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
    const rows = fromCsv(csv);
    let succeeded = 0;
    const failed: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const category = await this.categories.getCategory(row.category);
        await this.products.upsertFromImportRow(
          { slug: row.slug, name: row.name, categorySlug: row.category, price: row.price },
          category,
        );
        succeeded += 1;
      } catch (error) {
        failed.push({ row: i + 2, reason: error instanceof Error ? error.message : String(error) }); // +2: header row + 1-indexing
      }
    }
    return { succeeded, failed };
  }
}
