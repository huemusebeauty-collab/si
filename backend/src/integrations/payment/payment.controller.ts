import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaymentService } from "./payment.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { Public } from "@/common/decorators/public.decorator";

@ApiTags("payments")
@ApiBearerAuth()
@Controller({ path: "payments", version: "1" })
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  // Sprint 5.2 — @Public() to match Sprint 4's guest-checkout allowance
  // on order creation; the same optional-auth pattern from Sprint 4.15
  // applies at the JwtAuthGuard level.
  @Public()
  @Post("initiate")
  initiate(@Body() dto: InitiatePaymentDto) {
    return this.payments.initiatePayment(dto.orderId, dto.amount, dto.currency, dto.idempotencyKey);
  }

  @Get(":providerReference/verify")
  verify(@Param("providerReference") providerReference: string) {
    return this.payments.verifyPayment(providerReference);
  }

  @Post(":orderId/refund")
  refund(@Param("orderId") orderId: string, @Body() body: { amount: number; reason?: string }) {
    return this.payments.initiateRefund(orderId, body.amount, body.reason);
  }

  @Get(":providerReference/sync")
  sync(@Param("providerReference") providerReference: string) {
    return this.payments.syncStatus(providerReference);
  }
}
