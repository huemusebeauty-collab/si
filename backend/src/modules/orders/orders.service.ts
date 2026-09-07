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
import { resolveInvoiceLayout, type InvoiceFormat, type InvoiceSize } from "./invoice.types";

const CANCELLABLE_BEFORE: OrderStatus[] = ["pending_payment", "confirmed", "processing"];
const RETURNABLE_AFTER: OrderStatus[] = ["delivered"];
const RETURN_WINDOW_DAYS = 30;

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

  async getOrder(orderId: string): Promise<OrderEntity> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: ["lineItems", "statusHistory"],
    });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  async listOrderHistory(customerId: string): Promise<OrderEntity[]> {
    return this.orders.find({ where: { customerId }, relations: ["lineItems", "statusHistory"], order: { createdAt: "DESC" } });
  }

  async getTodaysOrderStats(): Promise<{ count: number; revenue: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaysOrders = await this.orders.createQueryBuilder("order").where("order.createdAt >= :startOfDay", { startOfDay }).getMany();
    const revenue = todaysOrders.reduce((sum, o) => sum + Number(o.total), 0);
    return { count: todaysOrders.length, revenue: Math.round(revenue * 100) / 100 };
  }

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

    const [items, totalItems] = await qb.skip((filters.page - 1) * filters.pageSize).take(filters.pageSize).getManyAndCount();
    return { items, totalItems };
  }

  async getOrdersReport(dateFrom: Date, dateTo: Date) {
    const orders = await this.orders.createQueryBuilder("order").where("order.createdAt BETWEEN :from AND :to", { from: dateFrom, to: dateTo }).getMany();
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

  async createOrder(customerId: string, cartId: string, shippingAddress: Record<string, unknown>): Promise<OrderEntity> {
    const cart = await this.cart.findById(cartId);
    if (cart.customerId && cart.customerId !== customerId) {
      throw new DomainException(DomainErrorCode.REAUTHENTICATION_REQUIRED, "The cart does not belong to the authenticated customer.");
    }

    const activeLines = cart.lineItems.filter((li) => !li.savedForLater);
    if (activeLines.length === 0) {
      throw new DomainException(DomainErrorCode.CART_EMPTY, "Cannot create an order from an empty cart.");
    }

    return this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      let subtotal = 0;
      const snapshotLines: Partial<OrderLineItemEntity>[] = [];

      for (const line of activeLines) {
        const variant = await this.products.findVariantById(line.variantId);
        const unitPrice = Number(variant.product.salePrice ?? variant.product.price);
        subtotal += unitPrice * line.quantity;
        snapshotLines.push({
          variantId: line.variantId,
          productName: variant.product.name,
          unitPrice: unitPrice.toFixed(2),
          quantity: line.quantity,
        });
        await this.products.adjustStock(line.variantId, -line.quantity, manager);
      }

      const discountAmount = Math.max(0, Number(cart.discountAmount ?? 0));
      const total = Math.max(0, subtotal - discountAmount);
      const order = manager.create(OrderEntity, {
        customerId,
        status: "pending_payment",
        total: total.toFixed(2),
        currency: "INR",
        shippingAddress,
      });
      const savedOrder = await manager.save(order);

      for (const snapshot of snapshotLines) {
        await manager.save(manager.create(OrderLineItemEntity, { ...snapshot, order: savedOrder }));
      }
      await manager.save(manager.create(OrderStatusHistoryEntity, { order: savedOrder, status: "pending_payment" }));

      return this.getOrder(savedOrder.id);
    });
  }

  async confirmOrder(orderId: string, paymentReference: string): Promise<OrderEntity> {
    const order = await this.getOrder(orderId);
    if (order.status !== "pending_payment") {
      throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, `Cannot confirm an order in "${order.status}" status.`);
    }
    void paymentReference;
    return this.updateStatus(orderId, "confirmed");
  }

  async failOrder(orderId: string, _reason: string): Promise<OrderEntity> {
    return this.updateStatus(orderId, "payment_failed");
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<OrderEntity> {
    const order = await this.getOrder(orderId);
    if (!VALID_TRANSITIONS[order.status].includes(status)) {
      throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, `Cannot transition an order from "${order.status}" to "${status}".`);
    }
    order.status = status;
    await this.orders.save(order);
    await this.history.save(this.history.create({ order, status }));
    return this.getOrder(orderId);
  }

  async requestCancellation(orderId: string, reason: string): Promise<{ orderId: string; reason: string; accepted: boolean }> {
    const order = await this.getOrder(orderId);
    if (!CANCELLABLE_BEFORE.includes(order.status)) {
      throw new DomainException(DomainErrorCode.ORDER_NOT_CANCELLABLE, `Order cannot be cancelled once it has reached "${order.status}" status.`);
    }
    await this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      for (const line of order.lineItems) {
        await this.products.adjustStock(line.variantId, line.quantity, manager);
      }
      await manager.update(OrderEntity, order.id, { status: "cancelled" });
      await manager.save(manager.create(OrderStatusHistoryEntity, { order, status: "cancelled" }));
    });
    return { orderId, reason, accepted: true };
  }

  async requestReturn(orderId: string, lineItemIds: string[], reason: string): Promise<{ orderId: string; lineItemIds: string[]; reason: string; accepted: boolean }> {
    const order = await this.getOrder(orderId);
    if (!RETURNABLE_AFTER.includes(order.status)) {
      throw new DomainException(DomainErrorCode.ORDER_NOT_RETURNABLE, `Returns can only be requested after delivery (current status: "${order.status}").`);
    }
    const deliveredEntry = order.statusHistory.find((h) => h.status === "delivered");
    const deliveredAt = deliveredEntry?.changedAt ?? order.updatedAt;
    const daysSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      throw new DomainException(DomainErrorCode.RETURN_WINDOW_EXPIRED, `The ${RETURN_WINDOW_DAYS}-day return window for this order has passed.`);
    }
    return { orderId, lineItemIds, reason, accepted: true };
  }

  async checkRefundEligibility(orderId: string): Promise<{ eligible: boolean; reason?: string }> {
    const order = await this.getOrder(orderId);
    if (order.status === "returned") return { eligible: true };
    if (order.status === "cancelled" && order.total !== "0.00") return { eligible: true, reason: "Order was cancelled after payment was captured." };
    return { eligible: false, reason: `Orders in "${order.status}" status are not refund-eligible.` };
  }

  async generateInvoice(orderId: string, size?: string, format?: string): Promise<{
    orderId: string;
    lineItems: unknown[];
    total: string;
    currency: string;
    issuedAt: string;
    layout: { size: InvoiceSize; format: InvoiceFormat; width: "full" | "compact" | "80mm" | "58mm" };
  }> {
    const order = await this.getOrder(orderId);
    const layout = resolveInvoiceLayout(size, format);
    return {
      orderId: order.id,
      lineItems: order.lineItems,
      total: order.total,
      currency: order.currency,
      issuedAt: new Date().toISOString(),
      layout,
    };
  }

  async getTrackingStatus(orderId: string): Promise<{ orderId: string; timeline: OrderStatusHistoryEntity[] }> {
    const order = await this.getOrder(orderId);
    return { orderId: order.id, timeline: order.statusHistory };
  }
}
