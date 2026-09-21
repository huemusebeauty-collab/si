import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LogisticsController } from "./logistics.controller";
import { LogisticsService } from "./logistics.service";
import { ShipmentEntity } from "./entities/shipment.entity";
import { ShipmentEventEntity } from "./entities/shipment-event.entity";
import { OrderEntity } from "@/modules/orders/entities/order.entity";
import { OrdersModule } from "@/modules/orders/orders.module";
import { ProductsModule } from "@/modules/products/products.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ShipmentEntity, ShipmentEventEntity, OrderEntity]),
    OrdersModule,
    ProductsModule,
  ],
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
