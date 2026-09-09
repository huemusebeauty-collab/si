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

/** Test/dev adapter only. Production deployments must provide a durable object-storage adapter. */
export class MemoryMediaStorageAdapter implements MediaStorageAdapter {
  private readonly objects = new Map<string, StoredMedia>();

  async put(storageKey: string, data: Buffer, mimeType: string): Promise<StoredMedia> {
    const copy = Buffer.from(data);
    const stored: StoredMedia = {
      storageKey,
      mimeType,
      byteSize: copy.byteLength,
      checksumSha256: createHash("sha256").update(copy).digest("hex"),
      data: copy,
    };
    this.objects.set(storageKey, stored);
    return stored;
  }

  async get(storageKey: string): Promise<StoredMedia | undefined> {
    const item = this.objects.get(storageKey);
    return item ? { ...item, data: Buffer.from(item.data) } : undefined;
  }

  async delete(storageKey: string): Promise<void> {
    this.objects.delete(storageKey);
  }
}
