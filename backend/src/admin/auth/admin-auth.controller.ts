import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { RecoverPasswordDto } from "./dto/recover-password.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
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

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("password/reset/request")
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.adminAuth.requestPasswordReset(dto.email, dto.phoneNumber);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("password/reset/confirm")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.adminAuth.resetPassword(dto.resetToken, dto.code, dto.newPassword);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("password/change")
  async changePassword(
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: ChangePasswordDto,
  ) {
    const payload = await this.adminAuth.verifyAccessToken(this.extractBearer(authorization));
    return this.adminAuth.changePassword(payload.sub, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("password/recover")
  recoverPassword(
    @Headers("x-admin-recovery-token") recoveryToken: string | undefined,
    @Body() dto: RecoverPasswordDto,
  ) {
    if (!recoveryToken) throw new UnauthorizedException("Missing recovery authorization.");
    return this.adminAuth.recoverPassword(dto.email, dto.newPassword, recoveryToken);
  }

  private extractBearer(authorization?: string): string {
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedException("Missing admin login challenge.");
    return match[1];
  }
}
