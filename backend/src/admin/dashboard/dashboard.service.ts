import { Injectable } from "@nestjs/common";
import { OrdersService } from "@/modules/orders/orders.service";
import { ProductsService } from "@/modules/products/products.service";
import { ReviewsService } from "@/modules/reviews/reviews.service";
import { AuditLogService } from "@/admin/audit/audit-log.service";

// Sprint 6 §1 — Admin Dashboard. Pure aggregation over existing
// services — no new business logic, per this sprint's "reuse... do not
// duplicate" instruction.
@Injectable()
export class DashboardService {
  constructor(
    private readonly orders: OrdersService,
    private readonly products: ProductsService,
    private readonly reviews: ReviewsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getOverview() {
    const [todaysOrders, lowStockCount, pendingReviews, recentActivity] = await Promise.all([
      this.orders.getTodaysOrderStats(),
      this.products.getLowStockCount(),
      this.reviews.getPendingCount(),
      this.auditLog.getRecentActivity(10),
    ]);

    // Sprint 6 §1 — Pending Tasks: derived, not separately stored —
    // each item links to the screen that resolves it.
    const pendingTasks = [
      ...(lowStockCount > 0 ? [{ type: "low_stock", count: lowStockCount, label: `${lowStockCount} product(s) low/out of stock` }] : []),
      ...(pendingReviews > 0 ? [{ type: "pending_reviews", count: pendingReviews, label: `${pendingReviews} review(s) awaiting approval` }] : []),
    ];

    return {
      kpis: {
        todaysOrders: todaysOrders.count,
        todaysRevenue: todaysOrders.revenue,
        lowStockCount,
        pendingReviews,
      },
      pendingTasks,
      recentActivity,
    };
  }
}
