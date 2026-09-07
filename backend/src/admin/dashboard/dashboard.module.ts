import { Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { OrdersModule } from "@/modules/orders/orders.module";
import { ProductsModule } from "@/modules/products/products.module";
import { ReviewsModule } from "@/modules/reviews/reviews.module";
import { AuditModule } from "@/admin/audit/audit.module";

@Module({
  imports: [OrdersModule, ProductsModule, ReviewsModule, AuditModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
