import { Injectable, Logger } from "@nestjs/common";

// Sprint 5.11 — Monitoring & Observability: structured logging for every
// integration call, tagged with the provider name and a correlation ID
// (reuses the same request ID convention as
// RequestLoggingInterceptor from Sprint 3 — see IntegrationCorrelationIdStore
// below — so a single request's logs, from HTTP entry through to the
// external provider call, all carry the same ID).
export interface IntegrationLogContext {
  provider: string;
  operation: string;
  correlationId?: string;
  durationMs?: number;
  outcome: "success" | "failure" | "retry";
  errorMessage?: string;
}

@Injectable()
export class IntegrationLoggerService {
  private readonly logger = new Logger("Integration");

  log(context: IntegrationLogContext): void {
    const line = `[${context.correlationId ?? "-"}] ${context.provider}.${context.operation} — ${context.outcome}${
      context.durationMs !== undefined ? ` (${context.durationMs}ms)` : ""
    }${context.errorMessage ? ` — ${context.errorMessage}` : ""}`;

    if (context.outcome === "failure") {
      this.logger.warn(line);
    } else {
      this.logger.log(line);
    }
  }
}
