import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectionEntity } from "./entities/collection.entity";
import { CollectionsService } from "./collections.service";
import { CollectionsController } from "./collections.controller";
import { ProductsModule } from "@/modules/products/products.module";

@Module({
  imports: [TypeOrmModule.forFeature([CollectionEntity]), ProductsModule],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
