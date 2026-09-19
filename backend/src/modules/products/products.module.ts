import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductEntity } from "./entities/product.entity";
import { ProductVariantEntity } from "./entities/product-variant.entity";
import { InventoryMovementEntity } from "./entities/inventory-movement.entity";
import { ProductsService } from "./products.service";
import { ProductTaxService } from "./product-tax.service";
import { ProductsController } from "./products.controller";
import { CategoriesModule } from "@/modules/categories/categories.module";
import { DatabaseModule } from "@/database/database.module";

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, ProductVariantEntity, InventoryMovementEntity]), CategoriesModule, DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductTaxService],
  exports: [ProductsService, ProductTaxService],
})
export class ProductsModule {}
