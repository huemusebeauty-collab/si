import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { IntegrationCommonModule } from "./common/integration-common.module";
import { QueueModule } from "./queue/queue.module";
import { PaymentModule } from "./payment/payment.module";
import { ShippingModule } from "./shipping/shipping.module";
import { EmailModule } from "./email/email.module";
import { SmsModule } from "./sms/sms.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { IntegrationsController } from "./monitoring/integrations.controller";
import { ScheduledJobsService } from "./queue/scheduled-jobs.service";

// Sprint 5.1 — single entry point AppModule imports for the whole
// third-party integration layer, matching the numbering of this
// sprint's own deliverables (5.1 architecture -> 5.2-5.6 providers ->
// 5.7 webhooks -> 5.8 scheduled jobs -> 5.11 monitoring).
@Module({
  imports: [
    IntegrationCommonModule,
    ScheduleModule.forRoot(), // Sprint 5.8 — enables @Cron() decorators app-wide
    QueueModule,
    PaymentModule,
    ShippingModule,
    EmailModule,
    SmsModule,
    WebhooksModule,
  ],
  controllers: [IntegrationsController],
  providers: [ScheduledJobsService],
  exports: [PaymentModule, ShippingModule, EmailModule, SmsModule],
})
export class IntegrationsModule {}
