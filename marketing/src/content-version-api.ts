import type { MarketingDomainStore } from "./marketing-domain-store";
import { ContentVersioningService, type ContentVersionRepository } from "./content-versioning";

const ok = <T>(data: T) => ({ ok: true as const, data, generatedAt: new Date().toISOString() });
const fail = (error: string) => ({ ok: false as const, error, generatedAt: new Date().toISOString() });

export class ContentVersionApi {
  constructor(private readonly store: MarketingDomainStore, private readonly versions: ContentVersionRepository) {}

  async create(contentId: string, body: Record<string, unknown>) {
    try {
      const content = this.store.getContent(contentId.trim());
      if (!content) return fail("Content not found");
      const service = new ContentVersioningService(this.versions);
      return ok(await service.createFromContent(content, typeof body.changeNote === "string" ? body.changeNote.trim() : undefined, typeof body.createdBy === "string" ? body.createdBy.trim() : undefined));
    } catch (error) { return fail(error instanceof Error ? error.message : "Content version creation failed"); }
  }

  list(contentId: string) { return ok(this.versions.list(contentId.trim())); }
  get(versionId: string) { const version = this.versions.get(versionId.trim()); return version ? ok(version) : fail("Content version not found"); }
}
