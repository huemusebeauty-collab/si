import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderEntity } from "./entities/order.entity";
import { OrderLineItemEntity } from "./entities/order-line-item.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { CartModule } from "@/modules/cart/cart.module";
import { ProductsModule } from "@/modules/products/products.module";
import { DatabaseModule } from "@/database/database.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderLineItemEntity, OrderStatusHistoryEntity]),
    CartModule,
    ProductsModule,
    DatabaseModule, // Sprint 4.9 — TransactionService
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
