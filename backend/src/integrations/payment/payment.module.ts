import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PAYMENT_PROVIDER } from "./payment-provider.interface";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { StripePaymentProvider } from "./providers/stripe-payment.provider";
import { IdempotencyKeyEntity } from "./entities/idempotency-key.entity";
import { PaymentTransactionEntity } from "./entities/payment-transaction.entity";
import { IdempotencyService } from "./idempotency.service";
import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { OrdersModule } from "@/modules/orders/orders.module";

// Sprint 5.1/5.2/5.9 — config-driven provider selection: the
// PAYMENT_PROVIDER DI token resolves to whichever concrete class
// `payment.provider` config says (defaults to "mock" — see
// configuration.ts). Swapping providers means changing one env var,
// never editing PaymentService or any controller.
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([IdempotencyKeyEntity, PaymentTransactionEntity]),
    OrdersModule,
  ],
  controllers: [PaymentController],
  providers: [
    MockPaymentProvider,
    StripePaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, MockPaymentProvider, StripePaymentProvider],
      useFactory: (config: ConfigService, mock: MockPaymentProvider, stripe: StripePaymentProvider) => {
        const selected = config.get<string>("payment.provider");
        return selected === "stripe" ? stripe : mock;
      },
    },
    IdempotencyService,
    PaymentService,
  ],
  exports: [PaymentService, PAYMENT_PROVIDER, IdempotencyService],
})
export class PaymentModule {}
