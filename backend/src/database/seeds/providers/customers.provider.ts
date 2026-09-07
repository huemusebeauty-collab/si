import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { CustomersService } from "@/modules/customers/customers.service";
import { hashPassword } from "@/modules/auth/password.util";
import { CUSTOMER_SEEDS } from "../data/customers";

// Sprint 7.4.5 — no dedicated content-validation coverage (same
// documented reasoning as Coupons — Customers/Orders/Reviews are
// operational/transactional data, not editorial content, and weren't
// among Sprint 7.3's 8 named content types). Basic structural checks
// only (non-empty email, valid-looking address).
@Injectable()
export class CustomersSeedProvider implements SeedProvider {
  readonly name = "customers";
  readonly dependsOn: string[] = ["coupons"];

  constructor(private readonly customers: CustomersService) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    for (const seed of CUSTOMER_SEEDS) {
      if (!seed.email || !seed.email.includes("@")) {
        outcomes.push({ naturalKey: seed.email, action: "rejected-invalid" });
        continue;
      }
      if (dryRun) {
        outcomes.push({ naturalKey: seed.email, action: "created" });
        continue;
      }

      // Sprint 7.4.8 — Marketing consent + preferences, stored on the
      // existing `preferences` jsonb column (no schema change needed).
      // Alternates true/false across seeded customers for a realistic
      // demo mix rather than uniformly opted-in.
      const index = CUSTOMER_SEEDS.indexOf(seed);
      const { entity, wasCreated } = await this.customers.upsertByEmail({
        email: seed.email,
        passwordHash: await hashPassword("DemoPass123!"),
        firstName: seed.firstName,
        lastName: seed.lastName,
        preferences: { marketingConsent: index % 2 === 0, newsletter: index % 3 !== 0 },
      });

      // Sprint 7.4.7 — "Avoid duplicate media references" doesn't apply
      // here, but the same idempotency principle does for addresses:
      // `addAddress` always inserts, so check for an existing matching
      // address (by line1) before adding, rather than accumulating a
      // duplicate on every repeat seed run.
      const hasAddress = entity.addresses?.some((a) => a.line1 === seed.address.line1);
      if (!hasAddress) {
        await this.customers.addAddress(entity.id, { ...seed.address, isDefault: true });
      }

      outcomes.push({ naturalKey: seed.email, action: wasCreated ? "created" : "updated", entityId: entity.id });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    for (const outcome of outcomes) {
      if (outcome.entityId) await this.customers.deleteById(outcome.entityId);
    }
  }
}
