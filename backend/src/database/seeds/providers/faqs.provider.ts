import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { CmsService } from "@/modules/cms/cms.service";
import { ContentValidationService } from "@/admin/content-validation/content-validation.service";
import { FAQ_SEEDS } from "../data/faqs";

const SEED_SYSTEM_ADMIN_ID = "system-seed";

@Injectable()
export class FaqsSeedProvider implements SeedProvider {
  readonly name = "faqs";
  readonly dependsOn: string[] = ["cms-pages"];

  constructor(
    private readonly cms: CmsService,
    private readonly validation: ContentValidationService,
  ) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    for (const seed of FAQ_SEEDS) {
      const report = await this.validation.validateFaqContent(seed);
      if (!report.isValid) {
        outcomes.push({ naturalKey: seed.question, action: "rejected-invalid", validationReport: report });
        continue;
      }
      if (dryRun) {
        outcomes.push({ naturalKey: seed.question, action: "created", validationReport: report });
        continue;
      }
      const { entity, wasCreated } = await this.cms.upsertFaqByQuestion(seed, SEED_SYSTEM_ADMIN_ID);
      outcomes.push({ naturalKey: seed.question, action: wasCreated ? "created" : "updated", entityId: entity.id, validationReport: report });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    for (const outcome of outcomes) {
      if (outcome.entityId) await this.cms.deleteFaqById(outcome.entityId);
    }
  }
}
