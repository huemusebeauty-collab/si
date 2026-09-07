import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CartEntity } from "./entities/cart.entity";
import { CartLineItemEntity } from "./entities/cart-line-item.entity";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { ProductsModule } from "@/modules/products/products.module";
import { CouponsModule } from "@/admin/coupons/coupons.module";
import { SettingsModule } from "@/admin/settings/settings.module";

@Module({
  imports: [TypeOrmModule.forFeature([CartEntity, CartLineItemEntity]), ProductsModule, CouponsModule, SettingsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
