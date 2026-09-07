import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WishlistEntity } from "./entities/wishlist.entity";
import { WishlistItemEntity } from "./entities/wishlist-item.entity";
import { WishlistService } from "./wishlist.service";
import { WishlistController } from "./wishlist.controller";
import { CartModule } from "@/modules/cart/cart.module";
import { ProductsModule } from "@/modules/products/products.module";

@Module({
  imports: [TypeOrmModule.forFeature([WishlistEntity, WishlistItemEntity]), CartModule, ProductsModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
