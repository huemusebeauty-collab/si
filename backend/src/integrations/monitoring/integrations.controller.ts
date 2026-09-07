import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProviderStatusService } from "@/integrations/common/provider-status.service";
import { QueueMonitorService } from "@/integrations/queue/queue-monitor.service";
import { Public } from "@/common/decorators/public.decorator";

// Sprint 5.11 — Monitoring & Observability: provider status reporting +
// queue stats in one place, for ops visibility without grepping logs.
@ApiTags("integrations")
@Controller({ path: "integrations", version: "1" })
export class IntegrationsController {
  constructor(
    private readonly providerStatus: ProviderStatusService,
    private readonly queueMonitor: QueueMonitorService,
  ) {}

  // Sprint 5.11 — Health checks (extends Sprint 3's HealthController
  // rather than duplicating it — this is integration-specific status,
  // /v1/health/ready remains the overall app readiness probe).
  @Public()
  @Get("status")
  async getStatus() {
    const [providers, queues] = await Promise.all([
      Promise.resolve(this.providerStatus.getAll()),
      this.queueMonitor.getAllQueueStats(),
    ]);
    return { providers, queues };
  }

  @Public()
  @Get("dead-letter/:queueName")
  getDeadLetter(@Param("queueName") queueName: string) {
    // Sprint 5.11 — Failure alerts: Sprint 5 scope surfaces dead-letter
    // jobs via this read endpoint rather than an active alerting
    // integration (email/Slack/PagerDuty) — no alerting provider is in
    // scope this sprint (would itself be a new third-party integration
    // beyond Sprint 5's named list). Documented as a Known Issue /
    // natural Sprint 6+ addition once this data has somewhere to alert to.
    return this.queueMonitor.getDeadLetterJobs(queueName);
  }
}
