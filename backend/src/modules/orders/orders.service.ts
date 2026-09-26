import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { OrderEntity, type OrderStatus } from "./entities/order.entity";
import { OrderLineItemEntity } from "./entities/order-line-item.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";
import { InvoiceEntity } from "./entities/invoice.entity";
import { InvoiceSequenceEntity } from "./entities/invoice-sequence.entity";
import { ShipmentEntity } from "@/modules/logistics/entities/shipment.entity";
import { ShipmentEventEntity } from "@/modules/logistics/entities/shipment-event.entity";
import { CartService } from "@/modules/cart/cart.service";
import { ProductsService } from "@/modules/products/products.service";
import { TransactionService } from "@/database/transaction.service";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";
import { resolveInvoiceLayout, type InvoiceFormat, type InvoiceSize } from "./invoice.types";
import { calculateGstWithinMrp, roundMoney } from "./tax.utils";
import { SettingsService } from "@/admin/settings/settings.service";

const CANCELLABLE_BEFORE: OrderStatus[] = ["pending_payment", "confirmed", "processing"];
const RETURNABLE_AFTER: OrderStatus[] = ["delivered"];
const RETURN_WINDOW_DAYS = 30;
const REVENUE_STATUSES: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];

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
    @InjectRepository(InvoiceEntity) private readonly invoices: Repository<InvoiceEntity>,
    @InjectRepository(InvoiceSequenceEntity) private readonly invoiceSequences: Repository<InvoiceSequenceEntity>,
    @InjectRepository(ShipmentEntity) private readonly shipments: Repository<ShipmentEntity>,
    @InjectRepository(ShipmentEventEntity) private readonly shipmentEvents: Repository<ShipmentEventEntity>,
    private readonly cart: CartService,
    private readonly products: ProductsService,
    private readonly transactions: TransactionService,
    private readonly settings: SettingsService,
  ) {}

  async getOrder(orderId: string): Promise<OrderEntity> {
    const order = await this.orders.findOne({ where: { id: orderId }, relations: ["lineItems", "statusHistory"] });
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
    return { count: todaysOrders.length, revenue: roundMoney(revenue) };
  }

  async getMarketingCommerceIntelligence() {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 30);
    const previousStart = new Date(periodStart);
    previousStart.setDate(previousStart.getDate() - 30);

    const orders = await this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.lineItems", "lineItem")
      .where("order.createdAt >= :previousStart", { previousStart })
      .andWhere("order.createdAt < :now", { now })
      .getMany();

    const current = orders.filter((order) => order.createdAt >= periodStart && REVENUE_STATUSES.includes(order.status));
    const previous = orders.filter((order) => order.createdAt < periodStart && REVENUE_STATUSES.includes(order.status));
    const revenue = roundMoney(current.reduce((sum, order) => sum + Number(order.total), 0));
    const previousRevenue = roundMoney(previous.reduce((sum, order) => sum + Number(order.total), 0));
    const orderCount = current.length;
    const previousOrderCount = previous.length;

    const productTotals = new Map<string, { productName: string; units: number; revenue: number }>();
    for (const order of current) {
      for (const line of order.lineItems ?? []) {
        const key = line.productName;
        const existing = productTotals.get(key) ?? { productName: key, units: 0, revenue: 0 };
        existing.units += line.quantity;
        existing.revenue = roundMoney(existing.revenue + Number(line.unitPrice) * line.quantity);
        productTotals.set(key, existing);
      }
    }

    const topProducts = [...productTotals.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const inventory = await this.products.listInventory();
    const inventoryRiskProducts = inventory
      .filter((item) => item.stockState !== "in-stock")
      .slice(0, 12)
      .map((item) => ({
        sku: item.sku,
        name: item.product.name,
        category: item.product.category,
        stockQuantity: item.stockQuantity,
        stockState: item.stockState,
      }));

    const revenueTrend = revenue > previousRevenue * 1.05 ? "up" : revenue < previousRevenue * 0.95 ? "down" : "flat";
    return {
      dataSource: "live",
      windowDays: 30,
      generatedAt: now.toISOString(),
      revenue,
      previousRevenue,
      revenueTrend,
      orders: orderCount,
      previousOrders: previousOrderCount,
      aov: orderCount ? roundMoney(revenue / orderCount) : 0,
      topProducts,
      risingCategories: [],
      inventoryRiskProducts,
      lowStockCount: inventoryRiskProducts.length,
    };
  }

  async searchOrders(filters: { status?: OrderStatus; dateFrom?: string; dateTo?: string; customerQuery?: string; page: number; pageSize: number }) {
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
    const statusBreakdown = orders.reduce<Record<string, number>>((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {});
    return { orderCount: orders.length, averageOrderValue: orders.length ? roundMoney(totalRevenue / orders.length) : 0, totalRevenue: roundMoney(totalRevenue), statusBreakdown };
  }

  async createOrder(customerId: string, cartId: string, shippingAddress: Record<string, unknown>, idempotencyKey?: string, customerGstin?: string, customerLegalName?: string): Promise<OrderEntity> {
    const normalizedIdempotencyKey = idempotencyKey?.trim();
    const normalizedGstin = customerGstin?.trim().toUpperCase() || undefined;
    if (normalizedGstin && !/^\d{2}[A-Z0-9]{10}[A-Z]\d[A-Z]Z[A-Z0-9]$/.test(normalizedGstin)) {
      throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Customer GSTIN format is invalid.");
    }
    const normalizedLegalName = customerLegalName?.trim() || undefined;
    const placeOfSupplyState = typeof shippingAddress.region === "string" ? shippingAddress.region.trim() || undefined : undefined;
    const placeOfSupplyStateCode = typeof shippingAddress.stateCode === "string" ? shippingAddress.stateCode.trim() || undefined : undefined;
    if (normalizedIdempotencyKey && (normalizedIdempotencyKey.length < 1 || normalizedIdempotencyKey.length > 128)) {
      throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Idempotency-Key must be between 1 and 128 characters.");
    }

    if (normalizedIdempotencyKey) {
      const existingOrder = await this.orders.findOne({
        where: { customerId, idempotencyKey: normalizedIdempotencyKey },
        relations: ["lineItems", "statusHistory"],
      });
      if (existingOrder) return existingOrder;
    }

    const cart = await this.cart.findById(cartId, { sessionId: customerId, userId: customerId });
    if (cart.customerId && cart.customerId !== customerId) throw new DomainException(DomainErrorCode.REAUTHENTICATION_REQUIRED, "The cart does not belong to the authenticated customer.");
    const activeLines = cart.lineItems.filter((li) => !li.savedForLater);
    if (activeLines.length === 0) throw new DomainException(DomainErrorCode.CART_EMPTY, "Cannot create an order from an empty cart.");

    return this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const businessSettings = await this.settings.getBusinessSettings();
      const pricedLines: Array<{
        line: typeof activeLines[number];
        variant: Awaited<ReturnType<ProductsService["findVariantById"]>>;
        unitPrice: number;
        lineSubtotal: number;
      }> = [];
      let subtotal = 0;

      for (const line of activeLines) {
        const variant = await this.products.findVariantById(line.variantId, manager);
        const unitPrice = Number(variant.product.salePrice ?? variant.product.price);
        const mrp = variant.mrp == null ? null : Number(variant.mrp);
        if (mrp != null && unitPrice > mrp + 0.005) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, `Selling price for ${variant.sku} cannot exceed MRP.`);
        const lineSubtotal = roundMoney(unitPrice * line.quantity);
        subtotal = roundMoney(subtotal + lineSubtotal);
        pricedLines.push({ line, variant, unitPrice, lineSubtotal });
      }

      const requestedDiscount = Math.max(0, Number(cart.discountAmount ?? 0));
      const discountAmount = roundMoney(Math.min(requestedDiscount, subtotal));
      let allocatedDiscount = 0;
      let taxableAmount = 0;
      let taxAmount = 0;
      let total = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      const snapshotLines: Partial<OrderLineItemEntity>[] = [];

      for (let index = 0; index < pricedLines.length; index += 1) {
        const { line, variant, unitPrice, lineSubtotal } = pricedLines[index];
        const lineDiscount = index === pricedLines.length - 1 ? roundMoney(discountAmount - allocatedDiscount) : roundMoney(discountAmount * lineSubtotal / subtotal);
        allocatedDiscount = roundMoney(allocatedDiscount + lineDiscount);
        const tax = calculateGstWithinMrp({
          amountAfterDiscount: roundMoney(lineSubtotal - lineDiscount),
          mrp: variant.mrp == null ? null : Number(variant.mrp) * line.quantity,
          gstRate: variant.product.gstRate == null ? null : Number(variant.product.gstRate),
          taxInclusiveMrp: variant.product.taxInclusiveMrp,
          gstRegistered: businessSettings.gstRegistered,
          supplierStateCode: businessSettings.registeredStateCode,
          placeOfSupplyStateCode,
        });
        taxableAmount = roundMoney(taxableAmount + tax.taxableAmount);
        taxAmount = roundMoney(taxAmount + tax.taxAmount);
        cgstAmount = roundMoney(cgstAmount + tax.cgstAmount);
        sgstAmount = roundMoney(sgstAmount + tax.sgstAmount);
        igstAmount = roundMoney(igstAmount + tax.igstAmount);
        total = roundMoney(total + tax.grossAmount);
        snapshotLines.push({
          variantId: line.variantId,
          productName: variant.product.name,
          unitPrice: unitPrice.toFixed(2),
          mrp: variant.mrp == null ? undefined : Number(variant.mrp).toFixed(2),
          hsnCode: variant.product.hsnCode,
          gstRate: variant.product.gstRate,
          taxInclusiveMrp: variant.product.taxInclusiveMrp,
          discountAmount: lineDiscount.toFixed(2),
          taxableAmount: tax.taxableAmount.toFixed(2),
          taxAmount: tax.taxAmount.toFixed(2),
          taxType: tax.taxType,
          cgstRate: tax.cgstRate.toFixed(2),
          cgstAmount: tax.cgstAmount.toFixed(2),
          sgstRate: tax.sgstRate.toFixed(2),
          sgstAmount: tax.sgstAmount.toFixed(2),
          igstRate: tax.igstRate.toFixed(2),
          igstAmount: tax.igstAmount.toFixed(2),
          quantity: line.quantity,
        });
        await this.products.adjustStock(line.variantId, -line.quantity, manager, { reason: "order_reservation", referenceType: "cart_checkout", referenceId: cartId });
      }

      // Fee components are persisted separately so the customer bill can show them
      // independently. Shipping/logistics and platform fee calculation is not yet
      // configured, so the current production value is explicitly zero rather than
      // inventing a charge. Future fee rules must feed these values before total.
      const logisticsFee = 0;
      const platformFee = 0;
      total = roundMoney(total + logisticsFee + platformFee);
      if (total < 0 || (subtotal > 0 && total > subtotal + 0.005 && discountAmount === 0)) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Invalid tax calculation.");
      const order = manager.create(OrderEntity, { customerId, idempotencyKey: normalizedIdempotencyKey, customerGstin: normalizedGstin, customerLegalName: normalizedLegalName, placeOfSupplyState, placeOfSupplyStateCode, status: "pending_payment", subtotal: subtotal.toFixed(2), discountAmount: discountAmount.toFixed(2), taxableAmount: taxableAmount.toFixed(2), taxAmount: taxAmount.toFixed(2), logisticsFee: logisticsFee.toFixed(2), platformFee: platformFee.toFixed(2), total: total.toFixed(2), currency: "INR", shippingAddress });
      const savedOrder = await manager.save(order);
      for (const snapshot of snapshotLines) await manager.save(manager.create(OrderLineItemEntity, { ...snapshot, order: savedOrder }));
      await manager.save(manager.create(OrderStatusHistoryEntity, { order: savedOrder, status: "pending_payment" }));
      const createdOrder = await manager.findOne(OrderEntity, {
        where: { id: savedOrder.id },
        relations: ["lineItems", "statusHistory"],
      });
      if (!createdOrder) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Created order could not be loaded.");
      return createdOrder;
    }).catch(async (error: unknown) => {
      const driverError = error instanceof QueryFailedError ? (error as QueryFailedError & { driverError?: { code?: string; constraint?: string } }).driverError : undefined;
      if (normalizedIdempotencyKey && driverError?.code === "23505" && ["UQ_orders_customerId_idempotencyKey", "UQ_orders_idempotencyKey"].includes(driverError.constraint ?? "")) {
        const existingOrder = await this.orders.findOne({
          where: { customerId, idempotencyKey: normalizedIdempotencyKey },
          relations: ["lineItems", "statusHistory"],
        });
        if (existingOrder) return existingOrder;
      }
      throw error;
    });
  }

  async confirmOrder(orderId: string, paymentReference: string): Promise<OrderEntity> {
    const order = await this.getOrder(orderId);
    if (order.status !== "pending_payment") throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, `Cannot confirm an order in "${order.status}" status.`);
    void paymentReference;
    return this.updateStatus(orderId, "confirmed");
  }

  async updateAdminStatus(orderId: string, status: OrderStatus): Promise<OrderEntity> {
    const order = await this.getOrder(orderId);
    const paymentControlledTransitions: Array<[OrderStatus, OrderStatus]> = [
      ["pending_payment", "confirmed"],
      ["pending_payment", "payment_failed"],
      ["payment_failed", "pending_payment"],
    ];
    if (paymentControlledTransitions.some(([from, to]) => order.status === from && status === to)) {
      throw new DomainException(
        DomainErrorCode.INVALID_STATUS_TRANSITION,
        "Payment status transitions must be completed by the verified payment service.",
      );
    }

    const logisticsControlledTransitions: Array<[OrderStatus, OrderStatus]> = [
      ["processing", "shipped"],
      ["shipped", "delivered"],
      ["delivered", "returned"],
    ];
    if (logisticsControlledTransitions.some(([from, to]) => order.status === from && status === to)) {
      throw new DomainException(
        DomainErrorCode.INVALID_STATUS_TRANSITION,
        "Fulfillment status transitions must be completed by the logistics workflow.",
      );
    }
    return this.updateStatus(orderId, status);
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<OrderEntity> {
    const order = await this.getOrder(orderId);
    if (!VALID_TRANSITIONS[order.status].includes(status)) {
      throw new DomainException(
        DomainErrorCode.INVALID_STATUS_TRANSITION,
        `Cannot transition an order from "${order.status}" to "${status}".`,
      );
    }

    // Inventory restoration must lock and re-read the order inside the
    // transaction. Otherwise two concurrent cancellation/return requests
    // could both observe the old status and restore stock twice.
    if (status === "cancelled" || status === "returned") {
      return this.transactions.runInTransaction(async (queryRunner) => {
        const manager = queryRunner.manager;
        const lockedOrder = await manager.findOne(OrderEntity, {
          where: { id: order.id },
          relations: ["lineItems", "statusHistory"],
          lock: { mode: "pessimistic_write" },
        });
        if (!lockedOrder) throw new NotFoundException("Order not found.");
        if (!VALID_TRANSITIONS[lockedOrder.status].includes(status)) {
          throw new DomainException(
            DomainErrorCode.INVALID_STATUS_TRANSITION,
            "Cannot transition an order from \"" + lockedOrder.status + "\" to \"" + status + "\".",
          );
        }
        for (const line of lockedOrder.lineItems) {
          await this.products.adjustStock(line.variantId, line.quantity, manager, { reason: status === "returned" ? "order_return" : "order_cancellation", referenceType: "order", referenceId: lockedOrder.id });
        }
        await manager.update(OrderEntity, lockedOrder.id, { status });
        await manager.save(manager.create(OrderStatusHistoryEntity, { order: lockedOrder, status }));
        const updated = await manager.findOne(OrderEntity, {
          where: { id: lockedOrder.id },
          relations: ["lineItems", "statusHistory"],
        });
        if (!updated) throw new NotFoundException("Order not found.");
        return updated;
      });
    }

    order.status = status;
    await this.orders.save(order);
    await this.history.save(this.history.create({ order, status }));
    return this.getOrder(orderId);
  }

  async requestCancellation(orderId: string, reason: string): Promise<{ orderId: string; reason: string; accepted: boolean }> {
    const order = await this.getOrder(orderId);
    if (!CANCELLABLE_BEFORE.includes(order.status)) throw new DomainException(DomainErrorCode.ORDER_NOT_CANCELLABLE, `Order cannot be cancelled once it has reached "${order.status}" status.`);
    await this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const lockedOrder = await manager.findOne(OrderEntity, {
        where: { id: order.id },
        relations: ["lineItems", "statusHistory"],
        lock: { mode: "pessimistic_write" },
      });
      if (!lockedOrder) throw new NotFoundException("Order not found.");
      if (!CANCELLABLE_BEFORE.includes(lockedOrder.status)) {
        throw new DomainException(
          DomainErrorCode.ORDER_NOT_CANCELLABLE,
          `Order cannot be cancelled once it has reached "${lockedOrder.status}" status.`,
        );
      }

      const shipment = await manager.findOne(ShipmentEntity, {
        where: { orderId: lockedOrder.id },
        lock: { mode: "pessimistic_write" },
      });
      if (shipment && ["draft", "ready_to_ship", "pickup_scheduled"].includes(shipment.status)) {
        shipment.status = "cancelled";
        await manager.save(shipment);
        await manager.save(manager.create(ShipmentEventEntity, {
          shipmentId: shipment.id,
          status: "cancelled",
          description: "Shipment cancelled with the order.",
          eventAt: new Date(),
        }));
      }

      for (const line of lockedOrder.lineItems) await this.products.adjustStock(line.variantId, line.quantity, manager, { reason: "order_cancellation", referenceType: "order", referenceId: lockedOrder.id });
      await manager.update(OrderEntity, lockedOrder.id, { status: "cancelled" });
      await manager.save(manager.create(OrderStatusHistoryEntity, { order: lockedOrder, status: "cancelled" }));
    });
    return { orderId, reason, accepted: true };
  }

  async requestReturn(orderId: string, lineItemIds: string[], reason: string): Promise<{ orderId: string; lineItemIds: string[]; reason: string; accepted: boolean }> {
    const order = await this.getOrder(orderId);
    if (!RETURNABLE_AFTER.includes(order.status)) throw new DomainException(DomainErrorCode.ORDER_NOT_RETURNABLE, `Returns can only be requested after delivery (current status: "${order.status}").`);
    const requestedIds = new Set(lineItemIds);
    const orderLineIds = new Set(order.lineItems.map((line) => line.id));
    if (requestedIds.size === 0 || requestedIds.size !== orderLineIds.size || [...requestedIds].some((id) => !orderLineIds.has(id))) {
      throw new DomainException(DomainErrorCode.ORDER_NOT_RETURNABLE, "Partial returns are not supported by the current order lifecycle; request a return for all order line items.");
    }
    const deliveredEntry = order.statusHistory.find((h) => h.status === "delivered");
    const deliveredAt = deliveredEntry?.changedAt ?? order.updatedAt;
    const daysSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) throw new DomainException(DomainErrorCode.RETURN_WINDOW_EXPIRED, `The ${RETURN_WINDOW_DAYS}-day return window for this order has passed.`);

    return this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const lockedOrder = await manager.findOne(OrderEntity, {
        where: { id: orderId },
        relations: ["lineItems", "statusHistory"],
        lock: { mode: "pessimistic_write" },
      });
      if (!lockedOrder || lockedOrder.status !== "delivered") {
        throw new DomainException(DomainErrorCode.ORDER_NOT_RETURNABLE, "Return request is no longer available for this order.");
      }

      const shipment = await manager.findOne(ShipmentEntity, {
        where: { orderId },
        lock: { mode: "pessimistic_write" },
      });
      if (!shipment) throw new DomainException(DomainErrorCode.ORDER_NOT_RETURNABLE, "A delivered shipment is required before a return can be requested.");
      if (shipment.status === "return_requested" || shipment.status === "return_in_transit") {
        throw new DomainException(DomainErrorCode.ORDER_NOT_RETURNABLE, "A return has already been requested for this order.");
      }
      if (shipment.status !== "delivered") {
        throw new DomainException(DomainErrorCode.ORDER_NOT_RETURNABLE, `Return can only be requested from a delivered shipment (current: "${shipment.status}").`);
      }

      shipment.status = "return_requested";
      await manager.save(shipment);
      await manager.save(manager.create(ShipmentEventEntity, {
        shipmentId: shipment.id,
        status: "return_requested",
        description: reason.trim() || "Customer return requested.",
        eventAt: new Date(),
      }));
      return { orderId, lineItemIds, reason, accepted: true };
    });
  }

  async checkRefundEligibility(orderId: string): Promise<{ eligible: boolean; reason?: string }> {
    const order = await this.getOrder(orderId);
    if (order.status === "returned") return { eligible: true };
    if (order.status === "cancelled" && order.total !== "0.00") return { eligible: true, reason: "Order was cancelled after payment was captured." };
    return { eligible: false, reason: `Orders in "${order.status}" status are not refund-eligible.` };
  }

  async generateInvoice(orderId: string, size?: string, format?: string) {
    const order = await this.getOrder(orderId);
    if (!REVENUE_STATUSES.includes(order.status)) {
      throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, "An invoice is only available after payment is confirmed.");
    }
    const invoice = await this.invoices.findOne({ where: { orderId } });
    const layout = resolveInvoiceLayout(size, format);
    if (invoice) {
      return { ...invoice.snapshot, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, issuedAt: invoice.issuedAt.toISOString(), layout };
    }
    const issued = await this.issueInvoice(orderId);
    return { ...issued, layout };
  }

  async issueInvoice(orderId: string) {
    return this.transactions.runInTransaction(async (queryRunner) => {
      const orderRepo = queryRunner.manager.getRepository(OrderEntity);
      const invoiceRepo = queryRunner.manager.getRepository(InvoiceEntity);
      const sequenceRepo = queryRunner.manager.getRepository(InvoiceSequenceEntity);
      const order = await orderRepo.findOne({ where: { id: orderId }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("Order not found.");
      order.lineItems = await queryRunner.manager.getRepository(OrderLineItemEntity).find({ where: { order: { id: order.id } } });
      if (!REVENUE_STATUSES.includes(order.status)) {
        throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, "An invoice can only be issued for a confirmed or fulfilled order.");
      }
      const existing = await invoiceRepo.findOne({ where: { orderId } });
      if (existing) return { ...existing.snapshot, invoiceId: existing.id, invoiceNumber: existing.invoiceNumber, issuedAt: existing.issuedAt.toISOString(), layout: resolveInvoiceLayout("A4", "STANDARD") };

      const businessSettings = await this.settings.getBusinessSettings();
      if (businessSettings.gstRegistered && (!businessSettings.gstin || !businessSettings.registeredState || !businessSettings.registeredStateCode)) {
        throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "GST-registered supplier settings are incomplete.");
      }
      const now = new Date();
      const startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
      const financialYear = `${startYear}/${String(startYear + 1).slice(-2)}`;
      const seqRows = await sequenceRepo.query(
        `INSERT INTO "invoice_sequences" ("financialYear", "nextNumber") VALUES ($1, 2)
         ON CONFLICT ("financialYear") DO UPDATE SET "nextNumber" = "invoice_sequences"."nextNumber" + 1
         RETURNING "nextNumber" - 1 AS "issuedNumber"`,
        [financialYear],
      );
      const issuedNumber = Number(seqRows[0]?.issuedNumber);
      if (!Number.isInteger(issuedNumber) || issuedNumber < 1) throw new Error("Unable to allocate invoice number.");
      const shortFinancialYear = `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
      const invoiceNumber = `SLK/${shortFinancialYear}/${String(issuedNumber).padStart(6, "0")}`;
      const issuedAt = now;
      const snapshot = {
        orderId: order.id,
        customerId: order.customerId,
        supplier: {
          legalEntityName: businessSettings.legalEntityName ?? businessSettings.storeName,
          gstRegistered: businessSettings.gstRegistered,
          gstin: businessSettings.gstin ?? null,
          address: businessSettings.registeredAddress ?? businessSettings.businessAddress ?? null,
          state: businessSettings.registeredState ?? null,
          stateCode: businessSettings.registeredStateCode ?? null,
          reverseCharge: businessSettings.reverseChargeDefault,
        },
        recipient: {
          legalName: order.customerLegalName ?? null,
          gstin: order.customerGstin ?? null,
          deliveryAddress: order.shippingAddress,
        },
        placeOfSupply: { state: order.placeOfSupplyState ?? null, stateCode: order.placeOfSupplyStateCode ?? null },
        shippingAddress: order.shippingAddress,
        lineItems: order.lineItems,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        taxableAmount: order.taxableAmount,
        taxAmount: order.taxAmount,
        logisticsFee: order.logisticsFee,
        platformFee: order.platformFee,
        total: order.total,
        currency: order.currency,
        orderCreatedAt: order.createdAt.toISOString(),
      };
      const invoice = await invoiceRepo.save(invoiceRepo.create({ orderId: order.id, invoiceNumber, financialYear, issuedAt, snapshot }));
      return { ...snapshot, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, issuedAt: invoice.issuedAt.toISOString(), layout: resolveInvoiceLayout("A4", "STANDARD") };
    });
  }
  async getTrackingStatus(orderId: string): Promise<{ orderId: string; timeline: OrderStatusHistoryEntity[] }> {
    const order = await this.getOrder(orderId);
    return { orderId: order.id, timeline: order.statusHistory };
  }
}