import { OrderEntity } from "@/modules/orders/entities/order.entity";
import { OrderStatusHistoryEntity } from "@/modules/orders/entities/order-status-history.entity";
import { ShipmentEntity } from "./entities/shipment.entity";
import { ShipmentEventEntity } from "./entities/shipment-event.entity";
import { LogisticsService } from "./logistics.service";

describe("LogisticsService", () => {
  const shipments = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((input) => input),
    save: jest.fn(async (value) => ({ id: value.id ?? "shipment-1", ...value })),
  };
  const events = {
    findOne: jest.fn(),
    create: jest.fn((input) => input),
    save: jest.fn(async (value) => value),
    find: jest.fn(),
  };
  const orders = { findOne: jest.fn() };
  const products = { adjustStock: jest.fn() };
  const transactions = {
    runInTransaction: jest.fn(async (work: (queryRunner: unknown) => Promise<unknown>) => {
      const manager = {
        findOne: jest.fn(async (entity: unknown, options: unknown) => {
          if (entity === OrderEntity) return orders.findOne(options);
          if (entity === ShipmentEntity) return shipments.findOne(options);
          if (entity === ShipmentEventEntity) return events.findOne(options);
          if (entity === OrderStatusHistoryEntity) return null;
          return null;
        }),
        create: jest.fn((_entity: unknown, input: unknown) => input),
        save: jest.fn(async (value: unknown) => value),
      };
      return work({ manager });
    }),
  };

  let service: LogisticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LogisticsService(shipments as never, events as never, orders as never, products as never, transactions as never);
  });

  it("creates a shipment from a confirmed order and snapshots its address atomically", async () => {
    orders.findOne.mockResolvedValue({
      id: "order-1",
      status: "confirmed",
      shippingAddress: { city: "Jaipur" },
    });
    shipments.findOne.mockResolvedValue(null);

    const result = await service.createShipment({
      orderId: "order-1",
      carrier: "Test Courier",
      weightGrams: 500,
    });

    expect(result.orderId).toBe("order-1");
    expect(result.status).toBe("ready_to_ship");
    expect(result.shippingAddress).toEqual({ city: "Jaipur" });
    expect(transactions.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("rejects shipment creation for an order that is not ready for fulfillment", async () => {
    orders.findOne.mockResolvedValue({ id: "order-1", status: "pending_payment", shippingAddress: {} });

    await expect(service.createShipment({ orderId: "order-1" })).rejects.toThrow(
      "Shipment can only be created for a confirmed or processing order",
    );
  });

  it("rejects invalid shipment status transitions", async () => {
    shipments.findOne.mockResolvedValue({ id: "shipment-1", status: "delivered" });

    await expect(service.updateStatus("shipment-1", "in_transit")).rejects.toThrow(
      'Cannot transition shipment from "delivered" to "in_transit".',
    );
  });

  it("records tracking events and timestamps when a shipment is delivered", async () => {
    shipments.findOne.mockResolvedValue({ id: "shipment-1", status: "out_for_delivery" });
    events.findOne.mockResolvedValue(null);

    const result = await service.updateStatus("shipment-1", "delivered", {
      description: "Delivered to customer",
      location: "Jaipur",
      awbNumber: "AWB-123",
      externalEventId: "provider-event-1",
    });

    expect(result.deliveredAt).toBeInstanceOf(Date);
    expect(result.awbNumber).toBe("AWB-123");
    expect(events.findOne).toHaveBeenCalledTimes(1);
  });

  it("synchronizes picked-up shipment to shipped order and records history", async () => {
    const shipment = { id: "shipment-1", status: "ready_to_ship", orderId: "order-1" };
    shipments.findOne.mockResolvedValue(shipment);
    orders.findOne.mockResolvedValue({ id: "order-1", status: "processing" });

    const result = await service.updateStatus("shipment-1", "picked_up");

    expect(result.status).toBe("picked_up");
    expect(result.shippedAt).toBeInstanceOf(Date);
    expect(orders.findOne).toHaveBeenCalledTimes(1);
  });

  it("synchronizes delivered shipment to delivered order and records history", async () => {
    const shipment = { id: "shipment-1", status: "out_for_delivery", orderId: "order-1" };
    shipments.findOne.mockResolvedValue(shipment);
    orders.findOne.mockResolvedValue({ id: "order-1", status: "shipped" });

    const result = await service.updateStatus("shipment-1", "delivered");

    expect(result.status).toBe("delivered");
    expect(result.deliveredAt).toBeInstanceOf(Date);
  });

  it("synchronizes returned shipment to returned order", async () => {
    const shipment = { id: "shipment-1", status: "return_in_transit", orderId: "order-1" };
    shipments.findOne.mockResolvedValue(shipment);
    orders.findOne.mockResolvedValue({ id: "order-1", status: "delivered", lineItems: [{ variantId: "v1", quantity: 2 }] });

    const result = await service.updateStatus("shipment-1", "returned");

    expect(result.status).toBe("returned");
    expect(products.adjustStock).toHaveBeenCalledWith("v1", 2, expect.any(Object), { reason: "order_return", referenceType: "order", referenceId: "order-1" });
  });

  it("completes the return shipment lifecycle and restores stock only at final return", async () => {
    const shipment = { id: "shipment-1", status: "return_requested", orderId: "order-1" };
    shipments.findOne.mockResolvedValue(shipment);
    orders.findOne.mockResolvedValue({ id: "order-1", status: "delivered", lineItems: [{ variantId: "v1", quantity: 2 }] });

    const inTransit = await service.updateStatus("shipment-1", "return_in_transit", {
      externalEventId: "return-event-1",
    });
    expect(inTransit.status).toBe("return_in_transit");
    expect(products.adjustStock).not.toHaveBeenCalled();

    const returned = await service.updateStatus("shipment-1", "returned", {
      externalEventId: "return-event-2",
    });
    expect(returned.status).toBe("returned");
    expect(products.adjustStock).toHaveBeenCalledTimes(1);
    expect(products.adjustStock).toHaveBeenCalledWith(
      "v1",
      2,
      expect.any(Object),
      { reason: "order_return", referenceType: "order", referenceId: "order-1" },
    );
  });

  it("rejects shipment completion when the linked order cannot make the required transition", async () => {
    const shipment = { id: "shipment-1", status: "out_for_delivery", orderId: "order-1" };
    shipments.findOne.mockResolvedValue(shipment);
    orders.findOne.mockResolvedValue({ id: "order-1", status: "cancelled" });

    await expect(service.updateStatus("shipment-1", "delivered")).rejects.toThrow(
      'Cannot synchronize order "cancelled" with shipment "delivered".',
    );
  });

  it("ignores a duplicate external tracking event id", async () => {
    const shipment = { id: "shipment-1", status: "in_transit" };
    shipments.findOne.mockResolvedValue(shipment);
    events.findOne.mockResolvedValue({ id: "event-1", externalEventId: "provider-event-1" });

    const result = await service.updateStatus("shipment-1", "out_for_delivery", {
      externalEventId: "provider-event-1",
    });

    expect(result).toBe(shipment);
    expect(transactions.runInTransaction).toHaveBeenCalledTimes(1);
  });
});
