import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OrdersService } from "@/modules/orders/orders.service";
import { ProductsService } from "@/modules/products/products.service";
import { CustomersService } from "@/modules/customers/customers.service";
import { CouponsService } from "@/admin/coupons/coupons.service";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

// Sprint 6 §11 — Reports. Every report method here delegates to an
// existing domain service's aggregation method (added alongside this
// sprint's other services) — this controller does no computation of
// its own, only date-range parsing and response shaping.
@ApiTags("admin-reports")
@ApiBearerAuth()
@Controller({ path: "admin/reports", version: "1" })
export class ReportsController {
  constructor(
    private readonly orders: OrdersService,
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
    private readonly coupons: CouponsService,
  ) {}

  private parseRange(dateFrom?: string, dateTo?: string): { from: Date; to: Date } {
    const to = dateTo ? new Date(dateTo) : new Date();
    const from = dateFrom ? new Date(dateFrom) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // default: trailing 30 days
    return { from, to };
  }

  // Sprint 6 — Sales Summary report. Reuses OrdersService.getOrdersReport
  // (revenue/AOV/status breakdown IS the sales summary at Sprint 6's
  // scope — a separate day/week/month bucketing view is a Known Issue,
  // not built this sprint to avoid a second, near-duplicate aggregation
  // query).
  @RequirePermission("reports", "view")
  @Get("sales-summary")
  salesSummary(@Query("dateFrom") dateFrom?: string, @Query("dateTo") dateTo?: string) {
    const { from, to } = this.parseRange(dateFrom, dateTo);
    return this.orders.getOrdersReport(from, to);
  }

  @RequirePermission("reports", "view")
  @Get("orders")
  ordersReport(@Query("dateFrom") dateFrom?: string, @Query("dateTo") dateTo?: string) {
    const { from, to } = this.parseRange(dateFrom, dateTo);
    return this.orders.getOrdersReport(from, to);
  }

  @RequirePermission("reports", "view")
  @Get("customers")
  customersReport(@Query("dateFrom") dateFrom?: string, @Query("dateTo") dateTo?: string) {
    const { from, to } = this.parseRange(dateFrom, dateTo);
    return this.customers.getCustomersReport(from, to);
  }

  @RequirePermission("reports", "view")
  @Get("products")
  productsReport() {
    return this.products.getProductsReport();
  }

  @RequirePermission("reports", "view")
  @Get("coupons")
  couponsReport() {
    return this.coupons.getCouponsReport();
  }
}
