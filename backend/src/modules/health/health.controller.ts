import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller({ path: "health", version: "1" })
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
