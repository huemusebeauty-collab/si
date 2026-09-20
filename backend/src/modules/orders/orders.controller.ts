import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import type { OrderStatus } from "./entities/order.entity";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { createGuestCheckoutToken } from "@/common/security/guest-checkout-token";

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

  @RequirePermission("orders", "view")
  @Get("admin/:orderId/invoice")
  adminInvoice(
    @Param("orderId") orderId: string,
    @Query("size") size?: string,
    @Query("format") format?: string,
  ) {
    return this.orders.generateInvoice(orderId, size, format);
  }

  @RequirePermission("orders", "edit")
  @Post("admin/:orderId/invoice")
  issueAdminInvoice(@Param("orderId") orderId: string) {
    return this.orders.issueInvoice(orderId);
  }

  @RequirePermission("orders", "view")
  @Get("admin/:orderId")
  adminGet(@Param("orderId") orderId: string) {
    return this.orders.getOrder(orderId);
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
    return this.orders.updateAdminStatus(orderId, status);
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
  async create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: { customerId: string; cartId: string; shippingAddress: Record<string, unknown>; customerGstin?: string; customerLegalName?: string },
  ) {
    if (user && user.id !== body.customerId) {
      throw new DomainException(
        DomainErrorCode.REAUTHENTICATION_REQUIRED,
        "The order's customerId must match the authenticated customer.",
      );
    }
    const order = await this.orders.createOrder(body.customerId, body.cartId, body.shippingAddress, idempotencyKey, body.customerGstin, body.customerLegalName);
    return user ? order : { ...order, guestCheckoutToken: createGuestCheckoutToken(order.id) };
  }

  @Get(":orderId/refund-eligibility")
  async refundEligibility(@Param("orderId") orderId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.requireOwner(orderId, user);
    return this.orders.checkRefundEligibility(orderId);
  }



}
