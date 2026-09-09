import { createHash } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export class S3MediaStorageAdapter implements MediaStorageAdapter {
  constructor(private readonly client: S3Client, private readonly bucket: string) {}

  async put(storageKey: string, data: Buffer, mimeType: string): Promise<StoredMedia> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: storageKey, Body: data, ContentType: mimeType }));
    return { storageKey, mimeType, byteSize: data.byteLength, checksumSha256: createHash("sha256").update(data).digest("hex"), data: Buffer.from(data) };
  }

  async get(storageKey: string): Promise<StoredMedia | undefined> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      if (!result.Body) return undefined;
      const data = Buffer.from(await result.Body.transformToByteArray());
      return { storageKey, mimeType: result.ContentType ?? "application/octet-stream", byteSize: data.byteLength, checksumSha256: createHash("sha256").update(data).digest("hex"), data };
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NoSuchKey" || name === "NotFound") return undefined;
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

export const createMediaStorageAdapter = (): MediaStorageAdapter => {
  if (process.env.MEDIA_STORAGE_MODE === "memory") return new MemoryMediaStorageAdapter();
  if (process.env.MEDIA_STORAGE_MODE !== "s3") return new UnavailableMediaStorageAdapter();
  const bucket = process.env.MEDIA_STORAGE_BUCKET?.trim();
  if (!bucket) return new UnavailableMediaStorageAdapter();
  return new S3MediaStorageAdapter(new S3Client({
    region: process.env.MEDIA_STORAGE_REGION || "auto",
    endpoint: process.env.MEDIA_STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.MEDIA_STORAGE_FORCE_PATH_STYLE === "true",
    credentials: process.env.MEDIA_STORAGE_ACCESS_KEY && process.env.MEDIA_STORAGE_SECRET_KEY ? {
      accessKeyId: process.env.MEDIA_STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.MEDIA_STORAGE_SECRET_KEY,
    } : undefined,
  }), bucket);
};
