import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { RecoverPasswordDto } from "./dto/recover-password.dto";
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

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("password/change")
  changePassword(@Headers("authorization") authorization: string | undefined, @Body() dto: ChangePasswordDto) {
    const payload = this.extractAccessPayload(authorization);
    return this.adminAuth.changePassword(payload.sub, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("password/recover")
  recoverPassword(@Headers("x-admin-recovery-token") recoveryToken: string | undefined, @Body() dto: RecoverPasswordDto) {
    if (!recoveryToken) throw new UnauthorizedException("Missing recovery authorization.");
    return this.adminAuth.recoverPassword(dto.email, dto.newPassword, recoveryToken);
  }

  private extractBearer(authorization?: string): string {
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedException("Missing admin login challenge.");
    return match[1];
  }

  private extractAccessPayload(authorization?: string): { sub: string; purpose?: string } {
    const token = this.extractBearer(authorization);
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { sub?: string; purpose?: string; exp?: number };
      if (!payload.sub || payload.purpose) throw new Error("invalid");
      if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error("expired");
      return { sub: payload.sub };
    } catch {
      throw new UnauthorizedException("Invalid admin session.");
    }
  }
}
