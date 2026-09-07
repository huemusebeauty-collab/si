import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QUEUE_NAMES } from "./queue.constants";
import { QueueMonitorService } from "./queue-monitor.service";

// Sprint 5.8 — Background Jobs: BullMQ backed by the same Redis
// instance Sprint 1 already provisions (infrastructure/docker/
// docker-compose.yml) and Sprint 3/4 already use for caching —
// separate logical use (job queue vs. cache), same physical Redis.
//
// Default job options here (attempts + exponential backoff) are the
// "Retry policies" deliverable — every job in every queue gets this
// unless a processor explicitly overrides it. A job that exhausts all
// attempts moves to BullMQ's built-in failed-job state, which
// dead-letter concept (Sprint 5.8's "dead-letter handling" wording) both read from.
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>("redis.url") },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { age: 24 * 60 * 60 }, // keep 24h for observability, then GC
          removeOnFail: false, // Sprint 5.8 — failed jobs kept indefinitely (the dead-letter record) until manually cleared
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.SMS },
      { name: QUEUE_NAMES.WEBHOOK_RETRY },
      { name: QUEUE_NAMES.MEDIA_PROCESSING },
    ),
  ],
  providers: [QueueMonitorService],
  exports: [BullModule, QueueMonitorService],
})
export class QueueModule {}
