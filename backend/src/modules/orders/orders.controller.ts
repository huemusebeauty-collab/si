import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import type { OrderStatus } from "./entities/order.entity";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

@ApiTags("orders")
@ApiBearerAuth()
@Controller({ path: "orders", version: "1" })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  private async requireOwner(orderId: string, user: AuthenticatedUser) {
    const order = await this.orders.getOrder(orderId);
    if (order.customerId !== user.id) {
      throw new DomainException(DomainErrorCode.REAUTHENTICATION_REQUIRED, "You do not have access to this order.");
    }
    return order;
  }

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.listOrderHistory(user.id);
  }

  @Get(":orderId")
  async get(@Param("orderId") orderId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.requireOwner(orderId, user);
  }

  @Get(":orderId/tracking")
  async tracking(@Param("orderId") orderId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.requireOwner(orderId, user);
    return this.orders.getTrackingStatus(orderId);
  }

  @Get(":orderId/invoice")
  async invoice(
    @Param("orderId") orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("size") size?: string,
    @Query("format") format?: string,
  ) {
    await this.requireOwner(orderId, user);
    return this.orders.generateInvoice(orderId, size, format);
  }

  @RequirePermission("orders", "edit")
  @Patch(":orderId/status")
  updateStatus(@Param("orderId") orderId: string, @Body("status") status: OrderStatus) {
    return this.orders.updateStatus(orderId, status);
  }

  @Post(":orderId/cancel")
  async cancel(@Param("orderId") orderId: string, @CurrentUser() user: AuthenticatedUser, @Body("reason") reason: string) {
    await this.requireOwner(orderId, user);
    return this.orders.requestCancellation(orderId, reason);
  }

  @Post(":orderId/return")
  async requestReturn(
    @Param("orderId") orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body("lineItemIds") lineItemIds: string[],
    @Body("reason") reason: string,
  ) {
    await this.requireOwner(orderId, user);
    return this.orders.requestReturn(orderId, lineItemIds, reason);
  }

  // Public only because guest checkout creates orders. Authenticated callers
  // are still protected by the customerId check below.
  @Public()
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { customerId: string; cartId: string; shippingAddress: Record<string, unknown> },
  ) {
    if (user && user.id !== body.customerId) {
      throw new DomainException(
        DomainErrorCode.REAUTHENTICATION_REQUIRED,
        "The order's customerId must match the authenticated customer.",
      );
    }
    return this.orders.createOrder(body.customerId, body.cartId, body.shippingAddress);
  }

  @Public()
  @Post(":orderId/confirm")
  confirm(@Param("orderId") orderId: string, @Body("paymentReference") paymentReference: string) {
    return this.orders.confirmOrder(orderId, paymentReference);
  }

  @Public()
  @Post(":orderId/fail")
  fail(@Param("orderId") orderId: string, @Body("reason") reason: string) {
    return this.orders.failOrder(orderId, reason);
  }

  @Get(":orderId/refund-eligibility")
  async refundEligibility(@Param("orderId") orderId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.requireOwner(orderId, user);
    return this.orders.checkRefundEligibility(orderId);
  }

  @RequirePermission("orders", "view")
  @Get("admin/customer/:customerId")
  adminOrdersForCustomer(@Param("customerId") customerId: string) {
    return this.orders.listOrderHistory(customerId);
  }

  @RequirePermission("orders", "view")
  @Get("admin/search")
  adminSearch(
    @Query("status") status?: OrderStatus,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("customerQuery") customerQuery?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.orders.searchOrders({
      status,
      dateFrom,
      dateTo,
      customerQuery,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }
}
