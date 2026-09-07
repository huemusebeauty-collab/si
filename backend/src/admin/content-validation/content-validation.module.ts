import { Module } from "@nestjs/common";
import { ContentValidationService } from "./content-validation.service";
import { ContentValidationController } from "./content-validation.controller";
import { ProductsModule } from "@/modules/products/products.module";
import { CategoriesModule } from "@/modules/categories/categories.module";
import { CollectionsModule } from "@/modules/collections/collections.module";
import { CmsModule } from "@/modules/cms/cms.module";
import { SettingsModule } from "@/admin/settings/settings.module";

@Module({
  imports: [ProductsModule, CategoriesModule, CollectionsModule, CmsModule, SettingsModule],
  controllers: [ContentValidationController],
  providers: [ContentValidationService],
  exports: [ContentValidationService],
})
export class ContentValidationModule {}
