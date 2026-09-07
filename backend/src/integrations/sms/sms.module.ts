import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SMS_PROVIDER } from "./sms-provider.interface";
import { MockSmsProvider } from "./providers/mock-sms.provider";
import { OtpEntity } from "./entities/otp.entity";
import { OtpService } from "./otp.service";
import { SmsService } from "./sms.service";
import { SmsController } from "./sms.controller";
import { QueueModule } from "@/integrations/queue/queue.module";
import { SmsProcessor } from "@/integrations/queue/processors/sms.processor";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([OtpEntity]), QueueModule],
  controllers: [SmsController],
  providers: [
    MockSmsProvider,
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService, MockSmsProvider],
      useFactory: (config: ConfigService, mock: MockSmsProvider) => {
        void config.get<string>("sms.provider");
        return mock;
      },
    },
    OtpService,
    SmsService,
    SmsProcessor,
  ],
  exports: [SmsService, OtpService],
})
export class SmsModule {}
