import type { ContentStatus, MarketingContent } from "./contracts";
import { MarketingLifecycleService } from "./marketing-lifecycle";
import type { ContentVersionRepository } from "./content-versioning";
import type { PublishingAuditRepository } from "./publishing-audit";
import { createAuditEntry } from "./publishing-audit";

export type PublishingStatus = ContentStatus;

export class PublishingPipelineService {
  constructor(
    private readonly lifecycle: MarketingLifecycleService,
    private readonly versions: ContentVersionRepository,
    private readonly audit: PublishingAuditRepository,
  ) {}

  async transition(content: MarketingContent, to: PublishingStatus, actor: string, expectedVersionId: string): Promise<MarketingContent> {
    const cleanActor = actor.trim();
    if (!cleanActor) throw new Error("actor is required");
    const version = this.versions.get(expectedVersionId.trim());
    if (!version || version.contentId !== content.contentId) throw new Error("Publishing version mismatch");
    const current = this.lifecycle.getContent(content.contentId);
    if (!current) throw new Error(`Content not found: ${content.contentId}`);
    if (current.status !== content.status) throw new Error(`Publishing content state is stale: ${content.status} != ${current.status}`);
    if (current.status === "published" && to !== "published") throw new Error("Published content is immutable; create a new version instead");
    if (current.status === to) return current;

    const next = await this.lifecycle.updateContent(content.contentId, to);
    await this.audit.append(createAuditEntry(content.contentId, version.versionId, current.status, next.status, cleanActor));
    return next;
  }

  async schedule(content: MarketingContent, actor: string, expectedVersionId: string): Promise<MarketingContent> {
    return this.transition(content, "scheduled", actor, expectedVersionId);
  }

  async publish(content: MarketingContent, actor: string, expectedVersionId: string): Promise<MarketingContent> {
    return this.transition(content, "published", actor, expectedVersionId);
  }

  async getAudit(contentId: string) { return this.audit.list(contentId.trim()); }
}
