import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrderEntity, type OrderStatus } from "./entities/order.entity";
import { OrderLineItemEntity } from "./entities/order-line-item.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";
import { CartService } from "@/modules/cart/cart.service";
import { ProductsService } from "@/modules/products/products.service";
import { TransactionService } from "@/database/transaction.service";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";

const CANCELLABLE_BEFORE: OrderStatus[] = ["pending_payment", "confirmed", "processing"];
const RETURNABLE_AFTER: OrderStatus[] = ["delivered"];
const RETURN_WINDOW_DAYS = 30; // Phase 5 §16 Return Policy — Sprint 4 uses a fixed default; a per-tier/product override is a documented Sprint 5+ refinement

// Legal transitions for updateStatus — Phase 16 §16.8's lifecycle:
// Placed -> Processing -> Shipped -> Delivered -> (Cancelled | Returned).
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["confirmed", "payment_failed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  payment_failed: ["pending_payment", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

// Sprint 3.5 — OrderService, method signatures per Phase 16 §16.8.
// Sprint 4.6 — Order Lifecycle: order creation/confirmation (Phase 16
// §16.7's non-payment-gateway logic, hosted here rather than in a new
// Checkout module — Checkout was never scaffolded in Sprint 3, and
// Sprint 4's instruction is to deepen existing module boundaries, not
// create new ones; only the address/order-snapshot logic is
// implemented, payment gateway integration remains out of scope), a
// real status-transition state machine, and refund eligibility rules.
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(OrderLineItemEntity) private readonly lineItems: Repository<OrderLineItemEntity>,
    @InjectRepository(OrderStatusHistoryEntity) private readonly history: Repository<OrderStatusHistoryEntity>,
    private readonly cart: CartService,
    private readonly products: ProductsService,
    private readonly transactions: TransactionService,
  ) {}

  // getOrder(orderId) -> Order
  async getOrder(orderId: string): Promise<OrderEntity> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: ["lineItems", "statusHistory"],
    });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  // listOrderHistory(customerId) -> Order[]
  // Sprint 7.4 correction: was missing `relations: ["lineItems"]`
  // entirely — every caller (the customer's own order history page,
  // Sprint 6B's admin customer-detail order list, and this sprint's
  // ReviewsSeedProvider, which needs to check line items for verified-
  // purchase status) would have silently received orders with an
  // undefined `lineItems` array. Found while writing the seed provider,
  // fixed at the source rather than worked around locally, since every
  // other consumer had the same latent bug.
  async listOrderHistory(customerId: string): Promise<OrderEntity[]> {
    return this.orders.find({ where: { customerId }, relations: ["lineItems", "statusHistory"], order: { createdAt: "DESC" } });
  }

  // Sprint 6 — Admin Dashboard KPI (Phase 6 §1: "Today's Orders,
  // Today's Revenue"). A thin aggregation over the same `orders` table
  // every other OrdersService method reads — not a duplicate of order
  // business logic, just a different read shape for the dashboard.
  async getTodaysOrderStats(): Promise<{ count: number; revenue: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaysOrders = await this.orders
      .createQueryBuilder("order")
      .where("order.createdAt >= :startOfDay", { startOfDay })
      .getMany();
    const revenue = todaysOrders.reduce((sum, o) => sum + Number(o.total), 0);
    return { count: todaysOrders.length, revenue: Math.round(revenue * 100) / 100 };
  }

  // Sprint 6 — Admin Order Management: search/filter (Phase 6 §14).
  async searchOrders(filters: {
    status?: OrderStatus;
    dateFrom?: string;
    dateTo?: string;
    customerQuery?: string;
    page: number;
    pageSize: number;
  }) {
    const qb = this.orders.createQueryBuilder("order").orderBy("order.createdAt", "DESC");
    if (filters.status) qb.andWhere("order.status = :status", { status: filters.status });
    if (filters.dateFrom) qb.andWhere("order.createdAt >= :from", { from: filters.dateFrom });
    if (filters.dateTo) qb.andWhere("order.createdAt <= :to", { to: filters.dateTo });
    if (filters.customerQuery) qb.andWhere("order.customerId ILIKE :q", { q: `%${filters.customerQuery}%` });

    const [items, totalItems] = await qb
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize)
      .getManyAndCount();
    return { items, totalItems };
  }

  // Sprint 6 — Reports: Orders report (Phase 6 §11 — volume, AOV,
  // status breakdown over a period).
  async getOrdersReport(dateFrom: Date, dateTo: Date) {
    const orders = await this.orders
      .createQueryBuilder("order")
      .where("order.createdAt BETWEEN :from AND :to", { from: dateFrom, to: dateTo })
      .getMany();
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const statusBreakdown = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      orderCount: orders.length,
      averageOrderValue: orders.length > 0 ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      statusBreakdown,
    };
  }

  // Sprint 4.6/4.9 — Order creation. Snapshots cart contents into
  // immutable OrderLineItems (Phase 8 §4) and commits stock, all inside
  // one transaction (Sprint 4.9): if stock commitment fails partway
  // through (e.g. item 2 of 3 is out of stock), the whole order and all
  // stock adjustments already made in this call roll back — the
  // customer never ends up with a partially-stocked order.
  async createOrder(
    customerId: string,
    cartId: string,
    shippingAddress: Record<string, unknown>,
  ): Promise<OrderEntity> {
    const cart = await this.cart.findById(cartId);
    const activeLines = cart.lineItems.filter((li) => !li.savedForLater);
    if (activeLines.length === 0) {
      throw new DomainException(DomainErrorCode.CART_EMPTY, "Cannot create an order from an empty cart.");
    }

    return this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;

      let total = 0;
      const snapshotLines: Partial<OrderLineItemEntity>[] = [];
      for (const line of activeLines) {
        const variant = await this.products.findVariantById(line.variantId);
        const unitPrice = Number(variant.product.salePrice ?? variant.product.price);
        total += unitPrice * line.quantity;
        snapshotLines.push({
          variantId: line.variantId,
          productName: variant.product.name,
          unitPrice: unitPrice.toFixed(2),
          quantity: line.quantity,
        });
        // Sprint 4.9 — stock commitment happens inside the same
        // transaction as the order write by passing this transaction's
        // manager through — see the Sprint 4.9 correction noted on
        // ProductsService.adjustStock. adjustStock's own optimistic
        // lock (VersionColumn) still protects against a concurrent
        // request racing on the same variant even within this
        // transaction's isolation level.
        await this.products.adjustStock(line.variantId, -line.quantity, manager);
      }

      const order = manager.create(OrderEntity, {
        customerId,
        status: "pending_payment",
        total: total.toFixed(2),
        currency: "USD",
        shippingAddress,
      });
      const savedOrder = await manager.save(order);

      for (const snapshot of snapshotLines) {
        await manager.save(manager.create(OrderLineItemEntity, { ...snapshot, order: savedOrder }));
      }
      await manager.save(
        manager.create(OrderStatusHistoryEntity, { order: savedOrder, status: "pending_payment" }),
      );

      return this.getOrder(savedOrder.id);
    });
  }

  // confirmOrder(orderId, paymentReference) -> Order (status: confirmed)
  // Sprint 4.6/Phase 16 §16.7: receives only an opaque payment
  // reference/token — never raw card data — consistent with payment
  // gateway integration remaining out of scope; this method does not
  // call any payment provider, it only records that confirmation
  // happened and transitions status.
  async confirmOrder(orderId: string, paymentReference: string): Promise<OrderEntity> {
    const order = await this.getOrder(orderId);
    if (order.status !== "pending_payment") {
      throw new DomainException(
        DomainErrorCode.INVALID_STATUS_TRANSITION,
        `Cannot confirm an order in "${order.status}" status.`,
      );
    }
    void paymentReference; // Sprint 4 scope: accepted but not persisted — no PaymentEntity exists yet (Checkout module deferral, see Known Issues)
    return this.updateStatus(orderId, "confirmed");
  }

  // failOrder(orderId, reason) -> Order (status: payment_failed)
  // Preserves the cart (never deletes it) so the customer can retry
  // without re-entering address/shipping, per Phase 16 §16.7.
  async failOrder(orderId: string, _reason: string): Promise<OrderEntity> {
    return this.updateStatus(orderId, "payment_failed");
  }

  // updateStatus(orderId, status) -> Order (appends to status history)
  // Sprint 4.6 — now a real state machine (VALID_TRANSITIONS) rather
  // than an unconstrained write; Phase 16 §16.8's lifecycle diagram
  // enforced here, not just documented.
  async updateStatus(orderId: string, status: OrderStatus): Promise<OrderEntity> {
    const order = await this.getOrder(orderId);
    if (!VALID_TRANSITIONS[order.status].includes(status)) {
      throw new DomainException(
        DomainErrorCode.INVALID_STATUS_TRANSITION,
        `Cannot transition an order from "${order.status}" to "${status}".`,
      );
    }
    order.status = status;
    await this.orders.save(order);
    await this.history.save(this.history.create({ order, status }));
    return this.getOrder(orderId);
  }

  // requestCancellation(orderId, reason) -> CancellationRequest
  // Sprint 4.6 — releases committed stock back to inventory on
  // cancellation (the inverse of createOrder's adjustStock call), and
  // Sprint 4.9 — both the stock release and the status update happen
  // inside one transaction, via the same "pass the manager through"
  // pattern used by createOrder.
  async requestCancellation(orderId: string, reason: string): Promise<{ orderId: string; reason: string; accepted: boolean }> {
    const order = await this.getOrder(orderId);
    if (!CANCELLABLE_BEFORE.includes(order.status)) {
      throw new DomainException(
        DomainErrorCode.ORDER_NOT_CANCELLABLE,
        `Order cannot be cancelled once it has reached "${order.status}" status.`,
      );
    }
    await this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      for (const line of order.lineItems) {
        await this.products.adjustStock(line.variantId, line.quantity, manager); // release reserved stock
      }
      await manager.update(OrderEntity, order.id, { status: "cancelled" });
      await manager.save(manager.create(OrderStatusHistoryEntity, { order, status: "cancelled" }));
    });
    return { orderId, reason, accepted: true };
  }

  // requestReturn(orderId, lineItemIds, reason) -> ReturnRequest
  // Sprint 4.6 — now checks the return window (Phase 5 §16), not just
  // the Delivered-status gate Sprint 3 had.
  async requestReturn(
    orderId: string,
    lineItemIds: string[],
    reason: string,
  ): Promise<{ orderId: string; lineItemIds: string[]; reason: string; accepted: boolean }> {
    const order = await this.getOrder(orderId);
    if (!RETURNABLE_AFTER.includes(order.status)) {
      throw new DomainException(
        DomainErrorCode.ORDER_NOT_RETURNABLE,
        `Returns can only be requested after delivery (current status: "${order.status}").`,
      );
    }
    const deliveredEntry = order.statusHistory.find((h) => h.status === "delivered");
    const deliveredAt = deliveredEntry?.changedAt ?? order.updatedAt;
    const daysSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      throw new DomainException(
        DomainErrorCode.RETURN_WINDOW_EXPIRED,
        `The ${RETURN_WINDOW_DAYS}-day return window for this order has passed.`,
      );
    }
    return { orderId, lineItemIds, reason, accepted: true };
  }

  // Sprint 4.6 — Refund eligibility rules (new this sprint). Distinct
  // from requestReturn's gate: an order can be return-eligible but not
  // yet refund-eligible (refund only follows a completed/approved
  // return) — Sprint 4 scope models eligibility off order status alone
  // since a formal ReturnRequest entity doesn't exist yet (documented
  // in Known Issues as a Sprint 5+ addition once returns need their own
  // tracked lifecycle rather than being computed on the fly).
  async checkRefundEligibility(orderId: string): Promise<{ eligible: boolean; reason?: string }> {
    const order = await this.getOrder(orderId);
    if (order.status === "returned") {
      return { eligible: true };
    }
    if (order.status === "cancelled" && order.total !== "0.00") {
      return { eligible: true, reason: "Order was cancelled after payment was captured." };
    }
    return { eligible: false, reason: `Orders in "${order.status}" status are not refund-eligible.` };
  }

  // generateInvoice(orderId) -> InvoiceDocument
  async generateInvoice(orderId: string): Promise<{ orderId: string; lineItems: unknown[]; total: string; issuedAt: string }> {
    const order = await this.getOrder(orderId);
    return {
      orderId: order.id,
      lineItems: order.lineItems,
      total: order.total,
      issuedAt: new Date().toISOString(),
    };
  }

  // getTrackingStatus(orderId) -> TrackingTimeline
  async getTrackingStatus(orderId: string): Promise<{ orderId: string; timeline: OrderStatusHistoryEntity[] }> {
    const order = await this.getOrder(orderId);
    return { orderId: order.id, timeline: order.statusHistory };
  }
}
