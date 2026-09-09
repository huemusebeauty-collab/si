import { randomUUID } from "node:crypto";
import type { MediaRepository } from "./media-repository";
import type { MediaStorageAdapter } from "./media-storage";

export type MediaAssetStatus = "active" | "archived" | "deleted";
export interface MediaAsset {
  mediaId: string;
  contentId?: string;
  versionId?: string;
  kind: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  metadata: Record<string, unknown>;
  status: MediaAssetStatus;
  createdAt: string;
  updatedAt: string;
}

const ok = <T>(data: T) => ({ ok: true as const, data, generatedAt: new Date().toISOString() });
const fail = (error: string) => ({ ok: false as const, error, generatedAt: new Date().toISOString() });
const requireString = (body: Record<string, unknown>, key: string) => {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required`);
  return value.trim();
};

export class MediaApi {
  constructor(private readonly repository: MediaRepository, private readonly storage: MediaStorageAdapter) {}

  async upload(body: Record<string, unknown>) {
    try {
      const originalName = requireString(body, "originalName");
      const mimeType = requireString(body, "mimeType");
      const kind = requireString(body, "kind");
      const encoded = requireString(body, "dataBase64");
      const data = Buffer.from(encoded, "base64");
      if (!data.byteLength) throw new Error("dataBase64 must contain non-empty data");
      const mediaId = String(body.mediaId ?? `media_${randomUUID()}`);
      const storageKey = String(body.storageKey ?? `marketing/${mediaId}/${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
      const stored = await this.storage.put(storageKey, data, mimeType);
      const now = new Date().toISOString();
      const asset: MediaAsset = {
        mediaId,
        contentId: typeof body.contentId === "string" ? body.contentId : undefined,
        versionId: typeof body.versionId === "string" ? body.versionId : undefined,
        kind,
        storageKey: stored.storageKey,
        originalName,
        mimeType,
        byteSize: stored.byteSize,
        checksumSha256: stored.checksumSha256,
        width: typeof body.width === "number" ? body.width : undefined,
        height: typeof body.height === "number" ? body.height : undefined,
        durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : undefined,
        metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {},
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      await this.repository.save(asset);
      return ok(asset);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Media upload failed");
    }
  }

  list() { return ok(this.repository.list()); }

  get(id: string) {
    const asset = this.repository.get(id.trim());
    return asset ? ok(asset) : fail("Media asset not found");
  }

  async preview(id: string) {
    const asset = this.repository.get(id.trim());
    if (!asset || asset.status === "deleted") return fail("Media asset not found");
    const stored = await this.storage.get(asset.storageKey);
    if (!stored) return fail("Media object not found in storage");
    return ok({ mediaId: asset.mediaId, storageKey: asset.storageKey, mimeType: stored.mimeType, byteSize: stored.byteSize, checksumSha256: stored.checksumSha256, dataBase64: stored.data.toString("base64") });
  }

  async archive(id: string) {
    const asset = this.repository.get(id.trim());
    if (!asset) return fail("Media asset not found");
    if (asset.status === "deleted") return ok(asset);
    const updated = { ...asset, status: "archived" as const, updatedAt: new Date().toISOString() };
    await this.repository.save(updated);
    return ok(updated);
  }
}
