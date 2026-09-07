import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EMAIL_PROVIDER } from "./email-provider.interface";
import { MockEmailProvider } from "./providers/mock-email.provider";
import { EmailService } from "./email.service";
import { EmailController } from "./email.controller";
import { QueueModule } from "@/integrations/queue/queue.module";
import { EmailProcessor } from "@/integrations/queue/processors/email.processor";
import { SettingsModule } from "@/admin/settings/settings.module";

@Module({
  imports: [ConfigModule, QueueModule, SettingsModule],
  controllers: [EmailController],
  providers: [
    MockEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService, MockEmailProvider],
      useFactory: (config: ConfigService, mock: MockEmailProvider) => {
        void config.get<string>("email.provider"); // Sprint 5.9 — config-driven; only mock is registered this sprint
        return mock;
      },
    },
    EmailService,
    EmailProcessor,
  ],
  exports: [EmailService],
})
export class EmailModule {}
