import { Controller, Get, Version, VERSION_NEUTRAL } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators/public.decorator";

@ApiTags("health")
@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get("live")
  @Public()
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @Public()
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.pingCheck("database")]);
  }
}

@ApiTags("health")
@Controller("api/health")
export class RenderHealthController {
  @Get()
  @Public()
  @Version(VERSION_NEUTRAL)
  live() {
    return { status: "ok" };
  }
}
