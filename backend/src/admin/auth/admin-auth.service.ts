import { createHash, randomInt } from "crypto";
import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminUserEntity } from "./entities/admin-user.entity";
import { verifyPassword } from "@/modules/auth/password.util";
import { AuditLogService } from "@/admin/audit/audit-log.service";

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUserEntity) private readonly adminUsers: Repository<AdminUserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  private normalizePhone(phone: string): string {
    const normalized = phone.trim().replace(/[\s()-]/g, "");
    if (!/^\+?[1-9]\d{9,14}$/.test(normalized)) throw new BadRequestException("Enter a valid phone number.");
    return normalized;
  }

  private maskPhone(phone: string): string {
    return phone.length < 7 ? "***" : `${phone.slice(0, 3)}${"*".repeat(Math.max(3, phone.length - 5))}${phone.slice(-2)}`;
  }

  private hashOtp(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  async login(email: string, password: string): Promise<{ sessionToken: string; role: string; expiresAt: Date; phoneNumber?: string }> {
    const user = await this.adminUsers.findOne({ where: { email } });
    const isValid = Boolean(user?.active) && (await verifyPassword(password, user?.passwordHash ?? ""));

    await this.auditLog.record({
      actorId: user?.id ?? "unknown",
      actorEmail: email,
      module: "auth",
      action: isValid ? "password_verified" : "login_failure",
    });

    if (!isValid || !user) throw new UnauthorizedException("Invalid email or password.");

    const challengeToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, purpose: "admin_2fa" },
      { secret: this.config.get<string>("jwt.secret"), expiresIn: "10m" },
    );

    return {
      sessionToken: challengeToken,
      role: user.role,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      phoneNumber: user.phoneNumber ? this.maskPhone(user.phoneNumber) : undefined,
    };
  }

  async sendOtp(challengeToken: string, phoneNumber?: string): Promise<{ sent: true; phoneNumber: string; devOtp?: string }> {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = await this.jwt.verifyAsync(challengeToken, { secret: this.config.get<string>("jwt.secret") });
    } catch {
      throw new UnauthorizedException("Your login step has expired. Please sign in again.");
    }
    if (payload.purpose !== "admin_2fa" || !payload.sub) throw new UnauthorizedException("Invalid login challenge.");

    const user = await this.adminUsers.findOne({ where: { id: payload.sub } });
    if (!user?.active) throw new UnauthorizedException("Admin account is inactive.");

    const requestedPhone = phoneNumber ? this.normalizePhone(phoneNumber) : user.phoneNumber;
    if (!requestedPhone) throw new BadRequestException("Phone number is required for first-time admin 2FA setup.");
    if (user.phoneNumber && requestedPhone !== user.phoneNumber) throw new UnauthorizedException("This phone number is not registered for this admin.");

    if (!user.phoneNumber) user.phoneNumber = requestedPhone;

    const code = randomInt(100000, 1000000).toString();
    user.otpHash = this.hashOtp(code);
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.otpAttempts = 0;
    await this.adminUsers.save(user);

    await this.auditLog.record({ actorId: user.id, actorEmail: user.email, module: "auth", action: "otp_sent" });

    const devMode = process.env.ADMIN_OTP_DEV_MODE === "true";
    return { sent: true, phoneNumber: this.maskPhone(requestedPhone), ...(devMode ? { devOtp: code } : {}) };
  }

  async verifyOtp(challengeToken: string, code: string): Promise<{ sessionToken: string; role: string; expiresAt: Date }> {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = await this.jwt.verifyAsync(challengeToken, { secret: this.config.get<string>("jwt.secret") });
    } catch {
      throw new UnauthorizedException("Your login step has expired. Please sign in again.");
    }
    if (payload.purpose !== "admin_2fa" || !payload.sub) throw new UnauthorizedException("Invalid login challenge.");

    const user = await this.adminUsers.findOne({ where: { id: payload.sub } });
    if (!user?.active || !user.otpHash || !user.otpExpiresAt) throw new UnauthorizedException("Invalid or expired OTP.");
    if (user.otpExpiresAt.getTime() < Date.now()) throw new UnauthorizedException("OTP has expired. Please request a new code.");
    if (user.otpAttempts >= 5) throw new UnauthorizedException("Too many OTP attempts. Please request a new code.");

    if (!/^\d{6}$/.test(code) || this.hashOtp(code) !== user.otpHash) {
      user.otpAttempts += 1;
      await this.adminUsers.save(user);
      throw new UnauthorizedException("Invalid OTP.");
    }

    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    user.lastLoginAt = new Date();
    await this.adminUsers.save(user);

    await this.auditLog.record({ actorId: user.id, actorEmail: user.email, module: "auth", action: "login_success" });

    const sessionToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.config.get<string>("jwt.secret"), expiresIn: this.config.get<string>("jwt.accessTokenTtl") },
    );
    return { sessionToken, role: user.role, expiresAt: new Date(Date.now() + 15 * 60 * 1000) };
  }
}
