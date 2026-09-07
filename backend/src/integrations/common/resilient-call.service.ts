import { Injectable } from "@nestjs/common";
import { CircuitBreaker, type CircuitBreakerOptions } from "./circuit-breaker";
import { withRetry, type RetryOptions } from "./with-retry";
import { withTimeout } from "./with-timeout";
import { IntegrationLoggerService } from "./integration-logger.service";
import { ProviderStatusService } from "./provider-status.service";
import { getCurrentCorrelationId } from "./correlation-id.store";

// Sprint 5.1 — Integration Architecture: the single call path every
// provider adapter method routes through — timeout, then retry
// (respecting the circuit breaker's own fast-fail), then circuit
// breaker, with logging and status reporting wrapped around all of it.
// This is what makes "providers replaceable with minimal code changes"
// concrete: a business service (PaymentService, ShippingService, ...)
// never calls a provider directly — it calls this wrapper, so retry/
// timeout/circuit-breaker/logging behavior is identical regardless of
// which concrete provider is configured underneath.
export interface ResilientCallOptions {
  provider: string;
  operation: string;
  timeoutMs?: number;
  retry?: Partial<RetryOptions>;
  circuitBreakerOptions?: CircuitBreakerOptions;
}

@Injectable()
export class ResilientCallService {
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(
    private readonly logger: IntegrationLoggerService,
    private readonly status: ProviderStatusService,
  ) {}

  private getBreaker(provider: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(provider)) {
      this.breakers.set(provider, new CircuitBreaker(provider, options));
    }
    return this.breakers.get(provider)!;
  }

  async execute<T>(options: ResilientCallOptions, fn: () => Promise<T>): Promise<T> {
    const { provider, operation, timeoutMs = 10_000, retry, circuitBreakerOptions } = options;
    const breaker = this.getBreaker(provider, circuitBreakerOptions);
    const correlationId = getCurrentCorrelationId();
    const start = Date.now();

    try {
      const result = await breaker.execute(() =>
        withRetry(() => withTimeout(`${provider}.${operation}`, timeoutMs, fn), retry),
      );
      this.logger.log({ provider, operation, correlationId, durationMs: Date.now() - start, outcome: "success" });
      this.status.recordSuccess(provider, breaker.getState());
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.log({ provider, operation, correlationId, durationMs: Date.now() - start, outcome: "failure", errorMessage: message });
      this.status.recordFailure(provider, breaker.getState(), message);
      throw error;
    }
  }
}
