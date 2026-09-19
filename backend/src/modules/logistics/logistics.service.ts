import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrderEntity } from "@/modules/orders/entities/order.entity";
import { ShipmentEntity, type ShipmentStatus } from "./entities/shipment.entity";
import { ShipmentEventEntity } from "./entities/shipment-event.entity";
import { TransactionService } from "@/database/transaction.service";

const TERMINAL: ShipmentStatus[] = ["delivered", "rto", "returned", "cancelled"];

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  draft: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["pickup_scheduled", "picked_up", "cancelled"],
  pickup_scheduled: ["picked_up", "delivery_failed", "cancelled"],
  picked_up: ["in_transit", "delivery_failed", "rto"],
  in_transit: ["out_for_delivery", "delivery_failed", "rto"],
  out_for_delivery: ["delivered", "delivery_failed", "rto"],
  delivered: ["return_requested"],
  delivery_failed: ["pickup_scheduled", "rto"],
  rto: ["returned"],
  return_requested: ["return_in_transit", "cancelled"],
  return_in_transit: ["returned", "delivery_failed"],
  returned: [],
  cancelled: [],
};

@Injectable()
export class LogisticsService {
  constructor(
    @InjectRepository(ShipmentEntity) private readonly shipments: Repository<ShipmentEntity>,
    @InjectRepository(ShipmentEventEntity) private readonly events: Repository<ShipmentEventEntity>,
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    private readonly transactions: TransactionService,
  ) {}

  async getShipment(shipmentId: string) {
    const shipment = await this.shipments.findOne({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException("Shipment not found.");
    return shipment;
  }

  async getByOrder(orderId: string) {
    return this.shipments.findOne({ where: { orderId } });
  }

  async list(status?: ShipmentStatus) {
    return this.shipments.find({
      where: status ? { status } : undefined,
      order: { createdAt: "DESC" },
    });
  }

  async createShipment(input: {
    orderId: string;
    carrier?: string;
    serviceLevel?: string;
    weightGrams?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    estimatedDeliveryAt?: string;
  }) {
    return this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const order = await manager.findOne(OrderEntity, {
        where: { id: input.orderId },
        lock: { mode: "pessimistic_write" },
      });
      if (!order) throw new NotFoundException("Order not found.");
      if (!["confirmed", "processing"].includes(order.status)) {
        throw new Error(`Shipment can only be created for a confirmed or processing order (current: "${order.status}").`);
      }

      const existing = await manager.findOne(ShipmentEntity, { where: { orderId: input.orderId } });
      if (existing) return existing;

      const shipment = manager.create(ShipmentEntity, {
        orderId: order.id,
        status: "ready_to_ship",
        carrier: input.carrier,
        serviceLevel: input.serviceLevel,
        weightGrams: input.weightGrams,
        lengthCm: input.lengthCm == null ? undefined : input.lengthCm.toFixed(2),
        widthCm: input.widthCm == null ? undefined : input.widthCm.toFixed(2),
        heightCm: input.heightCm == null ? undefined : input.heightCm.toFixed(2),
        shippingAddress: order.shippingAddress,
        estimatedDeliveryAt: input.estimatedDeliveryAt ? new Date(input.estimatedDeliveryAt) : undefined,
      });
      const saved = await manager.save(shipment);
      await manager.save(manager.create(ShipmentEventEntity, {
        shipmentId: saved.id,
        status: saved.status,
        description: "Shipment created and ready to ship.",
        eventAt: new Date(),
      }));
      return saved;
    });
  }

  async updateStatus(shipmentId: string, status: ShipmentStatus, details?: {
    description?: string;
    location?: string;
    awbNumber?: string;
    trackingUrl?: string;
    failureReason?: string;
    externalEventId?: string;
  }) {
    return this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const shipment = await manager.findOne(ShipmentEntity, {
        where: { id: shipmentId },
        lock: { mode: "pessimistic_write" },
      });
      if (!shipment) throw new NotFoundException("Shipment not found.");

      if (details?.externalEventId) {
        const existingEvent = await manager.findOne(ShipmentEventEntity, {
          where: { externalEventId: details.externalEventId },
        });
        if (existingEvent) return shipment;
      }

      if (shipment.status !== status && !VALID_TRANSITIONS[shipment.status].includes(status)) {
        throw new Error(`Cannot transition shipment from "${shipment.status}" to "${status}".`);
      }

      shipment.status = status;
      if (details?.awbNumber !== undefined) shipment.awbNumber = details.awbNumber;
      if (details?.trackingUrl !== undefined) shipment.trackingUrl = details.trackingUrl;
      if (details?.failureReason !== undefined) shipment.failureReason = details.failureReason;
      if (status === "picked_up" && !shipment.shippedAt) shipment.shippedAt = new Date();
      if (status === "delivered" && !shipment.deliveredAt) shipment.deliveredAt = new Date();

      const saved = await manager.save(shipment);
      await manager.save(manager.create(ShipmentEventEntity, {
        shipmentId: saved.id,
        status,
        description: details?.description,
        location: details?.location,
        eventAt: new Date(),
        externalEventId: details?.externalEventId,
      }));
      return saved;
    });
  }

  async getTracking(shipmentId: string) {
    await this.getShipment(shipmentId);
    return this.events.find({
      where: { shipmentId },
      order: { eventAt: "ASC" },
    });
  }

  async getDashboard() {
    const shipments = await this.shipments.find();
    const counts = shipments.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: shipments.length,
      counts,
      exceptions: shipments.filter((item) => ["delivery_failed", "rto"].includes(item.status)).length,
      terminal: shipments.filter((item) => TERMINAL.includes(item.status)).length,
    };
  }
}
