import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaymentService } from "./payment.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { Public } from "@/common/decorators/public.decorator";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";

@ApiTags("payments")
@ApiBearerAuth()
@Controller({ path: "payments", version: "1" })
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  // Guest checkout may initiate payment for its own newly-created order.
  @Public()
  @Post("initiate")
  initiate(@CurrentUser() user: AuthenticatedUser | undefined, @Body() dto: InitiatePaymentDto) {
    return this.payments.initiatePayment(dto.orderId, dto.amount, dto.currency, dto.idempotencyKey, dto.guestCheckoutToken, user);
  }

  @Public()
  @Get(":providerReference/verify")
  verify(
    @Param("providerReference") providerReference: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers("x-guest-checkout-token") guestCheckoutToken?: string,
  ) {
    return this.payments.verifyPayment(providerReference, guestCheckoutToken, user);
  }

  @RequirePermission("orders", "edit")
  @Post(":orderId/refund")
  refund(@Param("orderId") orderId: string, @Body() body: { amount: number; reason?: string }) {
    return this.payments.initiateRefund(orderId, body.amount, body.reason);
  }

  @Public()
  @Get(":providerReference/sync")
  sync(
    @Param("providerReference") providerReference: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers("x-guest-checkout-token") guestCheckoutToken?: string,
  ) {
    return this.payments.syncStatus(providerReference, guestCheckoutToken, user);
  }
}
