import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { OrdersModule } from "@/modules/orders/orders.module";
import { ProductsModule } from "@/modules/products/products.module";
import { CustomersModule } from "@/modules/customers/customers.module";
import { CouponsModule } from "@/admin/coupons/coupons.module";

@Module({
  imports: [OrdersModule, ProductsModule, CustomersModule, CouponsModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
