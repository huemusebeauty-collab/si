import { LogisticsService } from "./logistics.service";

describe("LogisticsService", () => {
  const shipments = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((input) => input),
    save: jest.fn(async (value) => ({ id: value.id ?? "shipment-1", ...value })),
  };
  const events = {
    create: jest.fn((input) => input),
    save: jest.fn(async (value) => value),
    find: jest.fn(),
  };
  const orders = { findOne: jest.fn() };

  let service: LogisticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LogisticsService(shipments as never, events as never, orders as never);
  });

  it("creates a shipment from a confirmed order and snapshots its address", async () => {
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
    expect(events.save).toHaveBeenCalledTimes(1);
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
    shipments.save.mockImplementation(async (value) => value);

    const result = await service.updateStatus("shipment-1", "delivered", {
      description: "Delivered to customer",
      location: "Jaipur",
      awbNumber: "AWB-123",
    });

    expect(result.deliveredAt).toBeInstanceOf(Date);
    expect(result.awbNumber).toBe("AWB-123");
    expect(events.save).toHaveBeenCalledTimes(1);
  });
});
