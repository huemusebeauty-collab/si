import type { ValidationReport } from "@/admin/content-validation/validation-result";

// Sprint 7.4.5 — the contract every seed provider implements. Kept
// deliberately narrow: a provider knows how to seed ONE entity type
// and declares what it depends on; it does NOT know about ordering,
// dry-run, or rollback — that's SeedEngineService's job, so a provider
// author never has to reimplement orchestration concerns.
export interface SeedEntityOutcome {
  naturalKey: string; // the human-readable identifier used for upsert (slug/SKU/email/code)
  action: "created" | "updated" | "skipped-unchanged" | "rejected-invalid";
  entityId?: string; // the real DB id, once persisted (absent in dry-run)
  validationReport?: ValidationReport;
}

export interface SeedProviderResult {
  providerName: string;
  outcomes: SeedEntityOutcome[];
  durationMs: number;
}

export interface SeedProvider {
  readonly name: string;
  // Sprint 7.4.5 — "Execute providers in dependency order": each
  // provider names the OTHER providers (by `name`) that must run
  // first — e.g. ProductsProvider depends on ["categories", "collections"]
  // since a product references both by slug.
  readonly dependsOn: string[];

  // Sprint 7.4.7 — Idempotent Seeding: `run` must be safe to call
  // repeatedly — upsert by natural key, never blind-insert.
  // `dryRun: true` means validate and report what WOULD happen without
  // writing anything.
  run(dryRun: boolean): Promise<SeedProviderResult>;

  // Sprint 7.4.5 — Rollback on failure: given the outcomes THIS
  // provider produced in a run that later failed downstream, undo only
  // the entities it created/updated. Providers implement this as a
  // compensating action (delete-by-id for "created" outcomes; for
  // "updated" outcomes, rollback is a documented limitation — see
  // SEED_ENGINE.md's Known Issues, since restoring a previous value
  // would require snapshotting it first, which no provider does today).
  rollback(outcomes: SeedEntityOutcome[]): Promise<void>;
}
