import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash, randomBytes } from "crypto";
import { CustomersService } from "@/modules/customers/customers.service";
import { hashPassword, verifyPassword } from "./password.util";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";
import type { RegisterDto } from "./dto/register.dto";

// Sprint 3.3 — Authentication Foundation. Method signatures match Phase
// 16 §16.2 (AuthService) exactly. Per Sprint 3.3's explicit instruction
// ("Implement the framework only ... Do not implement complete business
// authentication flows yet"), the flows here are functionally real
// (they do issue working JWTs against real password hashes) but
// deliberately do NOT yet include: OTP delivery (no SMS/email provider
// wired — Sprint 3 OUT OF SCOPE excludes third-party integrations),
// guest-session upgrade merging, or admin-realm separation. Those are
// flagged in Known Issues as Sprint 4+ completions of this framework.
@Injectable()
export class AuthService {
  constructor(
    private readonly customers: CustomersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshTokenEntity) private readonly refreshTokens: Repository<RefreshTokenEntity>,
  ) {}

  // register(email, password) -> {customerId, sessionToken} (Phase 16 §16.2)
  async register(dto: RegisterDto): Promise<{ customerId: string; sessionToken: string }> {
    const passwordHash = await hashPassword(dto.password);
    const customer = await this.customers.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    const sessionToken = await this.issueAccessToken(customer.id, customer.email, "customer");
    return { customerId: customer.id, sessionToken };
  }

  // login(email, password | otp) -> {sessionToken, expiresAt} (Phase 16 §16.2)
  // Sprint 3 scope: password login only. OTP branch is a documented
  // Sprint 4+ completion (requires an SMS/email provider — out of scope).
  async login(email: string, password: string): Promise<{ sessionToken: string; expiresAt: Date }> {
    const customer = await this.customers.findByEmail(email);
    if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    const sessionToken = await this.issueAccessToken(customer.id, customer.email, "customer");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // matches jwt.accessTokenTtl (15m)
    return { sessionToken, expiresAt };
  }

  // logout(sessionToken) -> {success} (Phase 16 §16.2)
  // Sprint 3 scope: revokes refresh tokens for the customer; access-token
  // blocklisting (for immediate revocation before natural expiry) is a
  // Sprint 4+ completion once Redis-backed token blocklisting is needed.
  async logout(customerId: string): Promise<{ success: true }> {
    await this.refreshTokens.update({ customerId, revoked: false }, { revoked: true });
    return { success: true };
  }

  // refreshSession(sessionToken) -> {sessionToken, expiresAt} (Phase 16 §16.2)
  async refreshSession(refreshToken: string): Promise<{ sessionToken: string; expiresAt: Date }> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash, revoked: false } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token is invalid or expired.");
    }
    const customer = await this.customers.findById(stored.customerId);
    const sessionToken = await this.issueAccessToken(customer.id, customer.email, "customer");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    return { sessionToken, expiresAt };
  }

  async issueRefreshToken(customerId: string): Promise<string> {
    const raw = randomBytes(48).toString("hex");
    const tokenHash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // matches jwt.refreshTokenTtl (30d)
    await this.refreshTokens.save(this.refreshTokens.create({ customerId, tokenHash, expiresAt }));
    return raw;
  }

  private async issueAccessToken(sub: string, email: string, role: string): Promise<string> {
    return this.jwt.signAsync(
      { sub, email, role },
      { secret: this.config.get<string>("jwt.secret"), expiresIn: this.config.get<string>("jwt.accessTokenTtl") },
    );
  }

  private hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  // requestPasswordReset / resetPassword / verifyOtp / validateAdminSession
  // (Phase 16 §16.2) are NOT implemented in Sprint 3 — each requires a
  // dependency explicitly out of scope this sprint (email delivery, SMS
  // delivery, and the admin realm/role matrix respectively). Their
  // method signatures are reserved below so AuthController's shape
  // doesn't need to change when they're completed.
}
