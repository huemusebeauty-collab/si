import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebhookEventEntity } from "./entities/webhook-event.entity";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { PaymentModule } from "@/integrations/payment/payment.module";
import { ShippingModule } from "@/integrations/shipping/shipping.module";
import { QueueModule } from "@/integrations/queue/queue.module";
import { WebhookProcessor } from "@/integrations/queue/processors/webhook.processor";

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEventEntity]), PaymentModule, ShippingModule, QueueModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookProcessor],
})
export class WebhooksModule {}
