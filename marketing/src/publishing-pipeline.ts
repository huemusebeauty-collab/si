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
    if (content.status === "published" && to !== "published") throw new Error("Published content is immutable; create a new version instead");
    if (to === "published" && content.status !== "scheduled") throw new Error("Only scheduled content can be published");
    if (to === "scheduled" && !content.scheduledAt) throw new Error("Scheduled content requires scheduledAt");
    if (content.status === to) return content;

    const next = await this.lifecycle.updateContent(content.contentId, to);
    await this.audit.append(createAuditEntry(content.contentId, version.versionId, content.status, next.status, cleanActor));
    return next;
  }

  async publish(content: MarketingContent, actor: string, expectedVersionId: string): Promise<MarketingContent> {
    return this.transition(content, "published", actor, expectedVersionId);
  }

  async getAudit(contentId: string) { return this.audit.list(contentId.trim()); }
}
