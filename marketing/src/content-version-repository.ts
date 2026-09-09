import { Client } from "pg";
import type { ContentVersion, ContentVersionRepository } from "./content-versioning";

export class NeonContentVersionRepository implements ContentVersionRepository {
  private readonly versions = new Map<string, ContentVersion>();
  private readonly databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;

  private async withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("Marketing HQ persistence database URL is not configured");
    const client = new Client({ connectionString: this.databaseUrl });
    await client.connect();
    try { return await work(client); } finally { await client.end(); }
  }

  async hydrate(): Promise<void> {
    if (!this.databaseUrl) return;
    const rows = await this.withClient(async (client) => (await client.query(`SELECT version_id, content_id, version_number, format, title, hook, body, call_to_action, platform, change_note, created_by, created_at FROM marketing_hq_content_versions ORDER BY content_id, version_number ASC`)).rows);
    this.versions.clear();
    for (const row of rows) this.versions.set(row.version_id, this.fromRow(row));
  }

  async create(version: ContentVersion): Promise<ContentVersion> {
    if (this.databaseUrl) {
      await this.withClient((client) => client.query(`INSERT INTO marketing_hq_content_versions (version_id, content_id, version_number, format, title, hook, body, call_to_action, platform, change_note, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [version.versionId, version.contentId, version.versionNumber, version.format, version.title ?? null, version.hook, version.body, version.callToAction, version.platform ?? null, version.changeNote ?? null, version.createdBy ?? null, version.createdAt]).then(() => undefined));
    }
    this.versions.set(version.versionId, version);
    return version;
  }

  list(contentId: string) { return [...this.versions.values()].filter((v) => v.contentId === contentId).sort((a, b) => b.versionNumber - a.versionNumber); }
  get(versionId: string) { return this.versions.get(versionId); }

  private fromRow(row: any): ContentVersion {
    return { versionId: row.version_id, contentId: row.content_id, versionNumber: Number(row.version_number), format: row.format, title: row.title ?? undefined, hook: row.hook, body: row.body, callToAction: row.call_to_action, platform: row.platform ?? undefined, changeNote: row.change_note ?? undefined, createdBy: row.created_by ?? undefined, createdAt: new Date(row.created_at).toISOString() };
  }
}
