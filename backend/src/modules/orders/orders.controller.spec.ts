import { OrdersController } from "./orders.controller";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

describe("OrdersController tracking ownership", () => {
  const user = { id: "customer-1" } as AuthenticatedUser;

  it("rejects tracking requests for another customer's order", async () => {
    const orders = {
      getOrder: jest.fn().mockResolvedValue({ id: "order-2", customerId: "customer-2" }),
      getTrackingStatus: jest.fn(),
    };
    const controller = new OrdersController(orders as never);

    await expect(controller.tracking("order-2", user)).rejects.toThrow(
      "You do not have access to this order.",
    );
    expect(orders.getTrackingStatus).not.toHaveBeenCalled();
  });

  it("returns tracking for the order's owner", async () => {
    const tracking = { orderId: "order-1", timeline: [{ status: "confirmed" }] };
    const orders = {
      getOrder: jest.fn().mockResolvedValue({ id: "order-1", customerId: "customer-1" }),
      getTrackingStatus: jest.fn().mockResolvedValue(tracking),
    };
    const controller = new OrdersController(orders as never);

    await expect(controller.tracking("order-1", user)).resolves.toEqual(tracking);
    expect(orders.getTrackingStatus).toHaveBeenCalledWith("order-1");
  });
});
