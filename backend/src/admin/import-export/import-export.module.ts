import { Module } from "@nestjs/common";
import { ImportExportService } from "./import-export.service";
import { ImportExportController } from "./import-export.controller";
import { ProductsModule } from "@/modules/products/products.module";
import { CategoriesModule } from "@/modules/categories/categories.module";

@Module({
  imports: [ProductsModule, CategoriesModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
})
export class ImportExportModule {}
