import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject } from "@nestjs/common";
import type { Job } from "bullmq";
import { SMS_PROVIDER, type SmsProvider, type SendSmsInput } from "@/integrations/sms/sms-provider.interface";
import { QUEUE_NAMES } from "../queue.constants";
import { ResilientCallService } from "@/integrations/common/resilient-call.service";

@Processor(QUEUE_NAMES.SMS)
export class SmsProcessor extends WorkerHost {
  constructor(
    @Inject(SMS_PROVIDER) private readonly provider: SmsProvider,
    private readonly resilientCall: ResilientCallService,
  ) {
    super();
  }

  async process(job: Job<SendSmsInput>): Promise<void> {
    await this.resilientCall.execute(
      { provider: this.provider.name, operation: "sendSms", timeoutMs: 8_000, retry: { maxAttempts: 1 } },
      () => this.provider.send(job.data),
    );
  }
}
