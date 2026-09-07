import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { ApiTags } from "@nestjs/swagger";

// Sprint 3.2 — Core Infrastructure / Sprint 3.6 — API Standards §16.16:
// "Every service exposes a health-check hook." Liveness is a bare 200;
// readiness checks the database connection is actually reachable.
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get("live")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.pingCheck("database")]);
  }
}
