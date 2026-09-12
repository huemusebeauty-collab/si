import type { MarketingDomainStore } from "./marketing-domain-store";
import { ContentVersioningService } from "./content-versioning";
import type { NeonContentVersionRepository } from "./content-studio-persistence";

const ok = <T>(data: T) => ({ ok: true as const, data, generatedAt: new Date().toISOString() });
const fail = (error: string) => ({ ok: false as const, error, generatedAt: new Date().toISOString() });

export class ContentStudioApi {
  private readonly versioning: ContentVersioningService;
  constructor(private readonly store: MarketingDomainStore, private readonly versions: NeonContentVersionRepository) {
    this.versioning = new ContentVersioningService(versions);
  }

  async hydrate() { await this.versions.hydrate(); }

  list() {
    const items = this.store.listContent().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return ok({ total: items.length, byStatus: Object.fromEntries(["idea", "draft", "qa_passed", "approved", "scheduled", "published", "rejected"].map((status) => [status, items.filter((item) => item.status === status).length])), items });
  }

  get(contentId: string) {
    const item = this.store.getContent(contentId.trim());
    return item ? ok({ content: item, versions: this.versions.list(item.contentId) }) : fail("Content not found");
  }

  async createVersion(contentId: string, body: Record<string, unknown>) {
    const content = this.store.getContent(contentId.trim());
    if (!content) return fail("Content not found");
    return ok(await this.versioning.createFromContent(content, typeof body.changeNote === "string" ? body.changeNote.trim() : undefined, typeof body.createdBy === "string" ? body.createdBy.trim() : undefined));
  }

  versionsFor(contentId: string) { return ok(this.versions.list(contentId.trim())); }
}
