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
import { ProductsModule } from "@/modules/products/products.module";
import { DatabaseModule } from "@/database/database.module";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([IdempotencyKeyEntity, PaymentTransactionEntity]),
    OrdersModule,
    ProductsModule,
    DatabaseModule,
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
