import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

export interface JwtPayload {
  sub: string; // customerId or adminId
  email: string;
  role: string;
}

// Sprint 3.3 — Authentication Foundation: JWT validation strategy.
// Session issuance (login/register) is deliberately minimal per Sprint
// 3.3's "framework only" instruction; this strategy is the fully
// functional half — validating a token presented on subsequent requests.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>("jwt.secret");
    if (!secret) {
      throw new Error("JWT_SECRET is not configured — see .env.example");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub) {
      throw new UnauthorizedException("Invalid token payload.");
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
