import { Module } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { StorageController } from "./storage.controller";
import { SettingsModule } from "@/admin/settings/settings.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductEntity } from "@/modules/products/entities/product.entity";

@Module({
  imports: [SettingsModule, TypeOrmModule.forFeature([ProductEntity])],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
