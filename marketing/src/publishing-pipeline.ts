export type PublishingStatus =
  | "idea"
  | "draft"
  | "qa_passed"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected";

export interface PublishingContent {
  contentId: string;
  versionId: string;
  status: PublishingStatus;
  scheduledAt?: string;
  publishedAt?: string;
}

export interface PublishingAuditEntry {
  contentId: string;
  versionId: string;
  from: PublishingStatus;
  to: PublishingStatus;
  actor: string;
  at: string;
}

export class PublishingPipelineService {
  private readonly audit: PublishingAuditEntry[] = [];

  private readonly transitions: Record<PublishingStatus, PublishingStatus[]> = {
    idea: ["draft", "rejected"],
    draft: ["qa_passed", "rejected"],
    qa_passed: ["approved", "rejected"],
    approved: ["scheduled", "rejected"],
    scheduled: ["published", "rejected"],
    published: [],
    rejected: ["draft"],
  };

  transition(content: PublishingContent, to: PublishingStatus, actor: string, at = new Date().toISOString()): PublishingContent {
    if (content.status === to) return { ...content };
    if (content.status === "published") {
      throw new Error("Published content is immutable; create a new version instead");
    }
    if (!this.transitions[content.status].includes(to)) {
      throw new Error(`Invalid publishing transition: ${content.status} -> ${to}`);
    }
    if (to === "scheduled" && !content.scheduledAt) {
      throw new Error("Scheduled content requires scheduledAt");
    }
    if (to === "published" && !content.scheduledAt) {
      throw new Error("Only scheduled content can be published");
    }

    const next = { ...content, status: to };
    if (to === "published") next.publishedAt = at;
    this.audit.push({ contentId: content.contentId, versionId: content.versionId, from: content.status, to, actor, at });
    return next;
  }

  getAudit(contentId: string): PublishingAuditEntry[] {
    return this.audit.filter((entry) => entry.contentId === contentId).map((entry) => ({ ...entry }));
  }

  assertPublishable(content: PublishingContent, expectedVersionId: string): void {
    if (content.versionId !== expectedVersionId) {
      throw new Error("Publishing version mismatch");
    }
    if (content.status !== "scheduled") {
      throw new Error("Only scheduled content can be published");
    }
  }
}
