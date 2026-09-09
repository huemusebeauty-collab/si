import { Client } from "pg";
import type { MediaAsset } from "./media-api";

export interface MediaRepository {
  hydrate(): Promise<void>;
  save(asset: MediaAsset): Promise<void>;
  get(mediaId: string): MediaAsset | undefined;
  list(): MediaAsset[];
}

export class NeonMediaRepository implements MediaRepository {
  private readonly assets = new Map<string, MediaAsset>();
  private readonly databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;

  private async withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("Marketing HQ persistence database URL is not configured");
    const client = new Client({ connectionString: this.databaseUrl });
    await client.connect();
    try { return await work(client); } finally { await client.end(); }
  }

  async hydrate(): Promise<void> {
    if (!this.databaseUrl) return;
    const rows = await this.withClient(async (client) => (await client.query(`SELECT media_id, content_id, version_id, kind, storage_key, original_name, mime_type, byte_size, checksum_sha256, width, height, duration_seconds, metadata, status, created_at, updated_at FROM marketing_hq_media_assets ORDER BY created_at ASC`)).rows);
    this.assets.clear();
    for (const row of rows) this.assets.set(row.media_id, this.fromRow(row));
  }

  async save(asset: MediaAsset): Promise<void> {
    if (this.databaseUrl) await this.withClient((client) => client.query(`INSERT INTO marketing_hq_media_assets (media_id, content_id, version_id, kind, storage_key, original_name, mime_type, byte_size, checksum_sha256, width, height, duration_seconds, metadata, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16) ON CONFLICT (media_id) DO UPDATE SET content_id=EXCLUDED.content_id, version_id=EXCLUDED.version_id, kind=EXCLUDED.kind, storage_key=EXCLUDED.storage_key, original_name=EXCLUDED.original_name, mime_type=EXCLUDED.mime_type, byte_size=EXCLUDED.byte_size, checksum_sha256=EXCLUDED.checksum_sha256, width=EXCLUDED.width, height=EXCLUDED.height, duration_seconds=EXCLUDED.duration_seconds, metadata=EXCLUDED.metadata, status=EXCLUDED.status, updated_at=EXCLUDED.updated_at`, [asset.mediaId, asset.contentId ?? null, asset.versionId ?? null, asset.kind, asset.storageKey, asset.originalName, asset.mimeType, asset.byteSize, asset.checksumSha256, asset.width ?? null, asset.height ?? null, asset.durationSeconds ?? null, JSON.stringify(asset.metadata), asset.status, asset.createdAt, asset.updatedAt]).then(() => undefined));
    this.assets.set(asset.mediaId, asset);
  }

  get(mediaId: string) { return this.assets.get(mediaId); }
  list() { return [...this.assets.values()]; }

  private fromRow(row: any): MediaAsset {
    return { mediaId: row.media_id, contentId: row.content_id ?? undefined, versionId: row.version_id ?? undefined, kind: row.kind, storageKey: row.storage_key, originalName: row.original_name, mimeType: row.mime_type, byteSize: Number(row.byte_size), checksumSha256: row.checksum_sha256, width: row.width ?? undefined, height: row.height ?? undefined, durationSeconds: row.duration_seconds == null ? undefined : Number(row.duration_seconds), metadata: row.metadata ?? {}, status: row.status, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
  }
}
