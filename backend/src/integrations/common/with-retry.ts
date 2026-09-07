// Sprint 5.1 — Integration Architecture: retry policy. Exponential
// backoff with jitter, capped attempts. `isRetryable` lets each call
// site decide what counts as transient (e.g. a 5xx or network error)
// vs. permanent (e.g. a 4xx validation error, which retrying would
// never fix) — retrying a non-retryable error wastes time and can
// duplicate side effects (mitigated separately by idempotency keys —
// see payment/idempotency.service.ts).
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = { maxAttempts: 3, baseDelayMs: 200 };

export async function withRetry<T>(fn: () => Promise<T>, options: Partial<RetryOptions> = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = opts.isRetryable ? opts.isRetryable(error) : true;
      if (!retryable || attempt === opts.maxAttempts) {
        throw error;
      }
      const jitter = Math.random() * 0.3 + 0.85; // 85%-115% of base delay
      const delay = opts.baseDelayMs * 2 ** (attempt - 1) * jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError; // unreachable, satisfies TS control-flow analysis
}
