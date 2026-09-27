import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ProviderStatusService } from "@/integrations/common/provider-status.service";
import { QueueMonitorService } from "@/integrations/queue/queue-monitor.service";
import { Public } from "@/common/decorators/public.decorator";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { Audit } from "@/admin/audit/audit.decorator";

@ApiTags("integrations")
@ApiBearerAuth()
@Controller({ path: "integrations", version: "1" })
export class IntegrationsController {
  constructor(
    private readonly providerStatus: ProviderStatusService,
    private readonly queueMonitor: QueueMonitorService,
  ) {}

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
    return this.queueMonitor.getDeadLetterJobs(queueName);
  }

  @RequirePermission("settings", "edit")
  @Audit("settings", "queue_job_retry")
  @Post("dead-letter/:queueName/:jobId/retry")
  retryDeadLetter(
    @Param("queueName") queueName: string,
    @Param("jobId") jobId: string,
  ) {
    return this.queueMonitor.retryDeadLetterJob(queueName, jobId);
  }
}
