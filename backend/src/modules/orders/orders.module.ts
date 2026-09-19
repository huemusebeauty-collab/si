import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderEntity } from "./entities/order.entity";
import { OrderLineItemEntity } from "./entities/order-line-item.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";
import { InvoiceEntity } from "./entities/invoice.entity";
import { InvoiceSequenceEntity } from "./entities/invoice-sequence.entity";
import { ShipmentEntity } from "@/modules/logistics/entities/shipment.entity";
import { ShipmentEventEntity } from "@/modules/logistics/entities/shipment-event.entity";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { MarketingCommerceController } from "./marketing-commerce.controller";
import { CartModule } from "@/modules/cart/cart.module";
import { ProductsModule } from "@/modules/products/products.module";
import { DatabaseModule } from "@/database/database.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderLineItemEntity, OrderStatusHistoryEntity, InvoiceEntity, InvoiceSequenceEntity, ShipmentEntity, ShipmentEventEntity]),
    CartModule,
    ProductsModule,
    DatabaseModule, // Sprint 4.9 — TransactionService
  ],
  controllers: [OrdersController, MarketingCommerceController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
