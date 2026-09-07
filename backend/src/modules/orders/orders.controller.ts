import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import type { OrderStatus } from "./entities/order.entity";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { Query } from "@nestjs/common";

@ApiTags("orders")
@ApiBearerAuth()
@Controller({ path: "orders", version: "1" })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.listOrderHistory(user.id);
  }

  @Get(":orderId")
  get(@Param("orderId") orderId: string) {
    return this.orders.getOrder(orderId);
  }

  @Get(":orderId/tracking")
  tracking(@Param("orderId") orderId: string) {
    return this.orders.getTrackingStatus(orderId);
  }

  @Get(":orderId/invoice")
  invoice(@Param("orderId") orderId: string) {
    return this.orders.generateInvoice(orderId);
  }

  @Patch(":orderId/status")
  updateStatus(@Param("orderId") orderId: string, @Body("status") status: OrderStatus) {
    return this.orders.updateStatus(orderId, status);
  }

  @Post(":orderId/cancel")
  cancel(@Param("orderId") orderId: string, @Body("reason") reason: string) {
    return this.orders.requestCancellation(orderId, reason);
  }

  @Post(":orderId/return")
  requestReturn(
    @Param("orderId") orderId: string,
    @Body("lineItemIds") lineItemIds: string[],
    @Body("reason") reason: string,
  ) {
    return this.orders.requestReturn(orderId, lineItemIds, reason);
  }

  // Sprint 4.6 — Order creation/confirmation. @Public() since guest
  // checkout is part of Phase 8 §6's guest journey.
  //
  // Sprint 4.15 security fix (KI4-6/R4-2): JwtAuthGuard now attempts
  // optional auth on @Public() routes (see the guard's own comments) —
  // if the caller IS authenticated, `req.user` is populated even on
  // this public route, and we reject a request whose body `customerId`
  // doesn't match the authenticated identity, rather than trusting an
  // arbitrary client-supplied value. A true guest (no token at all)
  // still passes through with whatever customerId they supply — that
  // remains an intentionally open guest-checkout path, not a leftover
  // gap, until Sprint 5's guest-order-linking design is settled.
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
  refundEligibility(@Param("orderId") orderId: string) {
    return this.orders.checkRefundEligibility(orderId);
  }

  // Sprint 6B — Admin Order Management: search/filter (Phase 6 §14),
  // completing the gap Sprint 6A left service-layer only
  // (OrdersService.searchOrders existed with no HTTP endpoint).
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