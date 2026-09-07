import { Injectable } from "@nestjs/common";
import type { CircuitState } from "./circuit-breaker";

// Sprint 5.11 — Monitoring & Observability: Provider status reporting.
// Each provider adapter reports its outcome here; GET /v1/integrations/status
// (IntegrationsController) surfaces this for ops visibility without
// needing to grep logs.
export interface ProviderStatus {
  provider: string;
  circuitState: CircuitState;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
}

@Injectable()
export class ProviderStatusService {
  private readonly statuses = new Map<string, ProviderStatus>();

  recordSuccess(provider: string, circuitState: CircuitState): void {
    const current = this.get(provider);
    current.circuitState = circuitState;
    current.lastSuccessAt = new Date().toISOString();
    this.statuses.set(provider, current);
  }

  recordFailure(provider: string, circuitState: CircuitState, errorMessage: string): void {
    const current = this.get(provider);
    current.circuitState = circuitState;
    current.lastFailureAt = new Date().toISOString();
    current.lastError = errorMessage;
    this.statuses.set(provider, current);
  }

  private get(provider: string): ProviderStatus {
    return (
      this.statuses.get(provider) ?? {
        provider,
        circuitState: "closed",
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: null,
      }
    );
  }

  getAll(): ProviderStatus[] {
    return Array.from(this.statuses.values());
  }
}
