import { Client } from "pg";
import type { ContentVersion, ContentVersionRepository } from "./content-versioning";

export class NeonContentVersionRepository implements ContentVersionRepository {
  private readonly databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;

  private async withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("Marketing HQ persistence database URL is not configured");
    const client = new Client({ connectionString: this.databaseUrl });
    await client.connect();
    try { return await work(client); } finally { await client.end(); }
  }

  async create(version: ContentVersion): Promise<ContentVersion> {
    return this.withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO marketing_hq_content_versions
          (version_id, content_id, version_number, format, title, hook, body, call_to_action, platform, change_note, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (version_id) DO UPDATE SET
           version_number=EXCLUDED.version_number, title=EXCLUDED.title, hook=EXCLUDED.hook,
           body=EXCLUDED.body, call_to_action=EXCLUDED.call_to_action, platform=EXCLUDED.platform,
           change_note=EXCLUDED.change_note, created_by=EXCLUDED.created_by
         RETURNING version_id, content_id, version_number, format, title, hook, body, call_to_action, platform, change_note, created_by, created_at`,
        [version.versionId, version.contentId, version.versionNumber, version.format, version.title ?? null, version.hook, version.body, version.callToAction, version.platform ?? null, version.changeNote ?? null, version.createdBy ?? null, version.createdAt],
      );
      return this.map(result.rows[0]);
    });
  }

  list(contentId: string): ContentVersion[] {
    // Synchronous interface is backed by the hydrated in-process cache in production.
    // Use create/list/get through ContentStudioApi, which hydrates this repository first.
    return this.cache.filter((item) => item.contentId === contentId).sort((a, b) => b.versionNumber - a.versionNumber);
  }

  get(versionId: string): ContentVersion | undefined { return this.cache.find((item) => item.versionId === versionId); }

  private cache: ContentVersion[] = [];

  async hydrate(): Promise<void> {
    this.cache = await this.withClient(async (client) => {
      const result = await client.query(`SELECT version_id, content_id, version_number, format, title, hook, body, call_to_action, platform, change_note, created_by, created_at FROM marketing_hq_content_versions ORDER BY version_number DESC`);
      return result.rows.map((row) => this.map(row));
    });
  }

  private map(row: any): ContentVersion {
    return {
      versionId: row.version_id,
      contentId: row.content_id,
      versionNumber: Number(row.version_number),
      format: row.format,
      title: row.title ?? undefined,
      hook: row.hook,
      body: row.body,
      callToAction: row.call_to_action,
      platform: row.platform ?? undefined,
      changeNote: row.change_note ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}
