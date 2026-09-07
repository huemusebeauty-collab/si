import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminUserEntity } from "./entities/admin-user.entity";
import { verifyPassword } from "@/modules/auth/password.util";
import { AuditLogService } from "@/admin/audit/audit-log.service";

// Sprint 6 — Admin authentication. Deliberately login-only: admin user
// creation/provisioning is a seed/manual-operator concern (Phase 6 §12
// — "User Roles" management is itself Super-Admin-only, so there's no
// public admin self-registration endpoint), not a self-service flow.
// See src/database/seeds/run-seed.ts for how the first Super Admin is
// created.
@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUserEntity) private readonly adminUsers: Repository<AdminUserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  async login(email: string, password: string): Promise<{ sessionToken: string; role: string; expiresAt: Date }> {
    const user = await this.adminUsers.findOne({ where: { email } });
    const isValid = Boolean(user?.active) && (await verifyPassword(password, user?.passwordHash ?? ""));

    // Sprint 6 §15 — Login Activity: both successful AND failed
    // attempts are logged, per Phase 6 §15/§16's security review
    // support — a failed attempt is recorded against the attempted
    // email even though no AdminUserEntity match may exist, since a
    // string of failed attempts against one email is itself the
    // signal worth having.
    await this.auditLog.record({
      actorId: user?.id ?? "unknown",
      actorEmail: email,
      module: "auth",
      action: isValid ? "login_success" : "login_failure",
    });

    if (!isValid || !user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    user.lastLoginAt = new Date();
    await this.adminUsers.save(user);

    const sessionToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.config.get<string>("jwt.secret"), expiresIn: this.config.get<string>("jwt.accessTokenTtl") },
    );
    return { sessionToken, role: user.role, expiresAt: new Date(Date.now() + 15 * 60 * 1000) };
  }
}
