// Sprint 5.1 — Integration Architecture: circuit breaker foundation.
// Per-provider state machine (Closed -> Open -> Half-Open) so a
// struggling external provider (e.g. the payment gateway is down)
// fails fast instead of every request queuing up behind a slow/timing-
// out call. "Foundation" per this sprint's own wording — the state
// machine is real and usable, but there's no distributed/shared state
// (Redis-backed) yet; each app instance tracks its own breaker state
// in memory, documented as a Known Issue for multi-instance deployments.
export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number; // consecutive failures before opening
  resetTimeoutMs: number; // how long to stay open before trying half-open
}

export class CircuitOpenError extends Error {
  constructor(providerName: string) {
    super(`Circuit breaker is open for "${providerName}" — refusing to call until it recovers.`);
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly providerName: string,
    private readonly options: CircuitBreakerOptions = { failureThreshold: 5, resetTimeoutMs: 30_000 },
  ) {}

  getState(): CircuitState {
    if (this.state === "open" && this.openedAt !== null) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.options.resetTimeoutMs) {
        this.state = "half-open";
      }
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === "open") {
      throw new CircuitOpenError(this.providerName);
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
    this.openedAt = null;
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === "half-open" || this.consecutiveFailures >= this.options.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}
