import { AsyncLocalStorage } from "async_hooks";

// Sprint 5.11 — propagates the same request ID that
// RequestLoggingInterceptor (Sprint 3) generates/reads from
// `x-request-id`, through to integration-layer log lines, without
// threading a correlationId parameter through every single service
// method call. AsyncLocalStorage is Node's standard mechanism for this
// exact problem (implicit per-request context).
export const correlationIdStorage = new AsyncLocalStorage<string>();

export function getCurrentCorrelationId(): string | undefined {
  return correlationIdStorage.getStore();
}
