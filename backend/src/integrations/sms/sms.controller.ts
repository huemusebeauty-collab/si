import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { SmsService } from "./sms.service";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { MockSmsProvider } from "./providers/mock-sms.provider";

@ApiTags("sms")
@Controller({ path: "sms", version: "1" })
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // Sprint 5.5 — tighter than global default, OTP request is a sensitive/abusable endpoint
  @Post("otp/send")
  sendOtp(@Body("phoneNumber") phoneNumber: string) {
    return this.sms.sendLoginOtp(phoneNumber);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("otp/verify")
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const isValid = await this.sms.verifyLoginOtp(dto.phoneNumber, dto.code);
    return { valid: isValid };
  }

  @Roles("admin")
  @Get("sent")
  getSentMessages() {
    const provider = this.sms.getProvider();
    if (provider instanceof MockSmsProvider) {
      return provider.getSentMessages();
    }
    return { message: "Sent-message inspection is only available with the mock SMS provider." };
  }
}
