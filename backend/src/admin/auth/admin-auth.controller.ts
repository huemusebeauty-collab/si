import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { Public } from "@/common/decorators/public.decorator";

@ApiTags("admin-auth")
@Controller({ path: "admin/auth", version: "1" })
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto.email, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("otp/send")
  sendOtp(@Headers("authorization") authorization: string | undefined, @Body() body: { phoneNumber?: string }) {
    return this.adminAuth.sendOtp(this.extractBearer(authorization), body.phoneNumber);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("otp/verify")
  verifyOtp(@Headers("authorization") authorization: string | undefined, @Body() body: { code: string }) {
    return this.adminAuth.verifyOtp(this.extractBearer(authorization), body.code);
  }

  private extractBearer(authorization?: string): string {
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new Error("Missing admin login challenge.");
    return match[1];
  }
}
