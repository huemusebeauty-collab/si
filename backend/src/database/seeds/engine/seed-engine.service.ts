import { Injectable, Logger } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "./seed-provider.interface";

export interface SeedExecutionSummary {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  providerResults: SeedProviderResult[];
  totals: { created: number; updated: number; skippedUnchanged: number; rejectedInvalid: number };
  fatalError?: string;
  rolledBack: boolean;
}

// Sprint 7.4.5 — SeedEngineService: registers providers, topologically
// sorts them by `dependsOn`, executes in that order, and produces a
// single execution summary. This is the one place seed orchestration
// logic lives — individual providers (src/database/seeds/providers/)
// never sequence themselves or call each other directly.
@Injectable()
export class SeedEngineService {
  private readonly logger = new Logger("SeedEngine");
  private readonly providers = new Map<string, SeedProvider>();

  register(provider: SeedProvider): void {
    if (this.providers.has(provider.name)) {
      throw new Error(`Seed provider "${provider.name}" is already registered.`);
    }
    this.providers.set(provider.name, provider);
  }

  // Sprint 7.4.5 — "Execute providers in dependency order": a
  // straightforward topological sort (Kahn's algorithm) over the
  // `dependsOn` graph. Throws clearly on a cycle or a reference to an
  // unregistered provider, rather than silently running in
  // registration order (which would be a correctness bug, not a
  // convenience fallback).
  private resolveExecutionOrder(): SeedProvider[] {
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const provider of this.providers.values()) {
      inDegree.set(provider.name, 0);
      dependents.set(provider.name, []);
    }
    for (const provider of this.providers.values()) {
      for (const dep of provider.dependsOn) {
        if (!this.providers.has(dep)) {
          throw new Error(`Provider "${provider.name}" depends on unregistered provider "${dep}".`);
        }
        inDegree.set(provider.name, (inDegree.get(provider.name) ?? 0) + 1);
        dependents.get(dep)!.push(provider.name);
      }
    }

    const queue = [...inDegree.entries()].filter(([, deg]) => deg === 0).map(([name]) => name);
    const order: SeedProvider[] = [];
    while (queue.length > 0) {
      const name = queue.shift()!;
      order.push(this.providers.get(name)!);
      for (const dependent of dependents.get(name) ?? []) {
        const remaining = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, remaining);
        if (remaining === 0) queue.push(dependent);
      }
    }

    if (order.length !== this.providers.size) {
      const unresolved = [...this.providers.keys()].filter((name) => !order.some((p) => p.name === name));
      throw new Error(`Circular dependency detected among seed providers: ${unresolved.join(", ")}.`);
    }
    return order;
  }

  // Sprint 7.4.5/7.4.6/7.4.7 — the main entry point. `dryRun: true`
  // runs every provider's validation and upsert-decision logic without
  // persisting (each provider is responsible for honoring the flag —
  // see SEED_ENGINE.md for the contract). On a fatal error from any
  // provider, already-completed providers are rolled back in reverse
  // order (compensating actions — see SeedProvider.rollback's own
  // documented limitation for "updated" entities).
  async execute(dryRun = false): Promise<SeedExecutionSummary> {
    const startedAt = new Date();
    const order = this.resolveExecutionOrder();
    const providerResults: SeedProviderResult[] = [];
    let fatalError: string | undefined;
    let rolledBack = false;

    for (const provider of order) {
      const providerStart = Date.now();
      try {
        const result = await provider.run(dryRun);
        providerResults.push(result);
        this.logger.log(
          `[${dryRun ? "DRY-RUN" : "RUN"}] ${provider.name}: ${result.outcomes.length} entities processed in ${result.durationMs}ms`,
        );
      } catch (error) {
        fatalError = `Provider "${provider.name}" failed: ${error instanceof Error ? error.message : String(error)}`;
        this.logger.error(fatalError);
        break;
      }
    }

    if (fatalError && !dryRun) {
      rolledBack = true;
      this.logger.warn("Fatal error encountered — rolling back all completed providers in reverse order.");
      for (const result of [...providerResults].reverse()) {
        const provider = this.providers.get(result.providerName);
        if (!provider) continue;
        try {
          await provider.rollback(result.outcomes.filter((o) => o.action === "created" || o.action === "updated"));
        } catch (rollbackError) {
          this.logger.error(`Rollback failed for provider "${result.providerName}": ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        }
      }
    }

    const finishedAt = new Date();
    const totals = providerResults.reduce(
      (acc, r) => {
        for (const outcome of r.outcomes) {
          if (outcome.action === "created") acc.created += 1;
          else if (outcome.action === "updated") acc.updated += 1;
          else if (outcome.action === "skipped-unchanged") acc.skippedUnchanged += 1;
          else if (outcome.action === "rejected-invalid") acc.rejectedInvalid += 1;
        }
        return acc;
      },
      { created: 0, updated: 0, skippedUnchanged: 0, rejectedInvalid: 0 },
    );

    return {
      dryRun,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      totalDurationMs: finishedAt.getTime() - startedAt.getTime(),
      providerResults,
      totals,
      fatalError,
      rolledBack,
    };
  }
}
