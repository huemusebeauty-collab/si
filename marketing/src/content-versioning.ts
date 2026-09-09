import { randomUUID } from "node:crypto";
import type { MarketingContent } from "./contracts";
import type { MediaAsset } from "./media-api";

export interface ContentVersion {
  versionId: string;
  contentId: string;
  versionNumber: number;
  format: MarketingContent["format"];
  title?: string;
  hook: string;
  body: string;
  callToAction: string;
  platform?: string;
  changeNote?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ContentVersionRepository {
  create(version: ContentVersion): Promise<ContentVersion>;
  list(contentId: string): ContentVersion[];
  get(versionId: string): ContentVersion | undefined;
}

export class MemoryContentVersionRepository implements ContentVersionRepository {
  private readonly versions = new Map<string, ContentVersion>();
  async create(version: ContentVersion) {
    this.versions.set(version.versionId, version);
    return version;
  }
  list(contentId: string) {
    return [...this.versions.values()].filter((v) => v.contentId === contentId).sort((a, b) => b.versionNumber - a.versionNumber);
  }
  get(versionId: string) { return this.versions.get(versionId); }
}

export class ContentVersioningService {
  constructor(private readonly repository: ContentVersionRepository) {}

  async createFromContent(content: MarketingContent, changeNote?: string, createdBy?: string): Promise<ContentVersion> {
    const latest = this.repository.list(content.contentId)[0];
    const version: ContentVersion = {
      versionId: `version_${randomUUID()}`,
      contentId: content.contentId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      format: content.format,
      title: content.title,
      hook: content.hook,
      body: content.body,
      callToAction: content.callToAction,
      platform: content.platform,
      changeNote,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    return this.repository.create(version);
  }

  list(contentId: string) { return this.repository.list(contentId.trim()); }
  get(versionId: string) { return this.repository.get(versionId.trim()); }

  validateMediaLink(version: ContentVersion, media: MediaAsset) {
    if (media.contentId !== version.contentId) throw new Error("Media asset contentId does not match content version");
    if (media.versionId !== version.versionId) throw new Error("Media asset versionId does not match content version");
    return true;
  }
}
