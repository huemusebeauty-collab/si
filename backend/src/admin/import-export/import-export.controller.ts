import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { ImportExportService } from "./import-export.service";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { Audit } from "@/admin/audit/audit.decorator";

@ApiTags("admin-import-export")
@ApiBearerAuth()
@Controller({ path: "admin/products", version: "1" })
export class ImportExportController {
  constructor(private readonly importExport: ImportExportService) {}

  @RequirePermission("products", "view")
  @Get("export")
  async export(@Res() res: Response) {
    const csv = await this.importExport.exportProductsCsv();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="products-export-${Date.now()}.csv"`);
    res.send(csv);
  }

  @RequirePermission("products", "full")
  @Audit("products", "bulk_import")
  @Post("import")
  import(@Body("csv") csv: string) {
    return this.importExport.importProductsCsv(csv);
  }
}
