import { createHash } from "node:crypto";

export interface StoredMedia {
  storageKey: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  data: Buffer;
}

export interface MediaStorageAdapter {
  put(storageKey: string, data: Buffer, mimeType: string): Promise<StoredMedia>;
  get(storageKey: string): Promise<StoredMedia | undefined>;
  delete(storageKey: string): Promise<void>;
}

/** Test/dev adapter only. Never use this adapter for durable production media. */
export class MemoryMediaStorageAdapter implements MediaStorageAdapter {
  private readonly objects = new Map<string, StoredMedia>();
  async put(storageKey: string, data: Buffer, mimeType: string): Promise<StoredMedia> {
    const copy = Buffer.from(data);
    const stored = { storageKey, mimeType, byteSize: copy.byteLength, checksumSha256: createHash("sha256").update(copy).digest("hex"), data: copy };
    this.objects.set(storageKey, stored);
    return stored;
  }
  async get(storageKey: string) { const item = this.objects.get(storageKey); return item ? { ...item, data: Buffer.from(item.data) } : undefined; }
  async delete(storageKey: string) { this.objects.delete(storageKey); }
}

export class UnavailableMediaStorageAdapter implements MediaStorageAdapter {
  private readonly error = "Durable media object storage is not configured";
  async put(): Promise<StoredMedia> { throw new Error(this.error); }
  async get(): Promise<StoredMedia | undefined> { throw new Error(this.error); }
  async delete(): Promise<void> { throw new Error(this.error); }
}

export const createMediaStorageAdapter = (): MediaStorageAdapter => process.env.MEDIA_STORAGE_MODE === "memory" ? new MemoryMediaStorageAdapter() : new UnavailableMediaStorageAdapter();
