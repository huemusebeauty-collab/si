import { Client } from "pg";
import type { SocialAccount } from "./social-account-manager";
import type { SocialQueueItem } from "./social-center";

export type SocialAuditAction = "account_connected" | "account_disconnected" | "account_paused" | "account_resumed" | "account_automation_changed" | "post_scheduled" | "post_approved" | "post_status_changed";

export interface SocialAuditEntry {
  auditId: string;
  postId?: string;
  accountId?: string;
  action: SocialAuditAction;
  actor: string;
  fromStatus?: string;
  toStatus?: string;
  details: string;
  occurredAt: string;
}

export interface SocialPersistence {
  loadSocialAccounts(): Promise<SocialAccount[]>;
  saveSocialAccount(account: SocialAccount): Promise<void>;
  deleteSocialAccount(accountId: string): Promise<void>;
  loadSocialQueue(): Promise<SocialQueueItem[]>;
  saveSocialQueue(item: SocialQueueItem): Promise<void>;
  loadSocialAudit(): Promise<SocialAuditEntry[]>;
  saveSocialAudit(entry: SocialAuditEntry): Promise<void>;
}

export class NeonSocialPersistence implements SocialPersistence {
  private readonly databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;
  private async withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("Marketing HQ persistence database URL is not configured");
    const client = new Client({ connectionString: this.databaseUrl });
    await client.connect();
    try { return await work(client); } finally { await client.end(); }
  }
  async loadSocialAccounts(): Promise<SocialAccount[]> { return this.withClient(async (client) => { const result = await client.query("SELECT account_id, platform, display_name, status, scopes, connected_at, expires_at, automation_enabled, last_health_check_at, last_error FROM marketing_hq_social_accounts ORDER BY account_id ASC"); return result.rows.map((row) => ({ accountId: row.account_id, platform: row.platform, displayName: row.display_name, status: row.status, scopes: row.scopes ?? [], connectedAt: row.connected_at ? new Date(row.connected_at).toISOString() : undefined, expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined, automationEnabled: row.automation_enabled, lastHealthCheckAt: row.last_health_check_at ? new Date(row.last_health_check_at).toISOString() : undefined, lastError: row.last_error ?? undefined } as SocialAccount)); }); }
  async saveSocialAccount(account: SocialAccount): Promise<void> { await this.withClient((client) => client.query(`INSERT INTO marketing_hq_social_accounts (account_id, platform, display_name, status, scopes, connected_at, expires_at, automation_enabled, last_health_check_at, last_error) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10) ON CONFLICT (account_id) DO UPDATE SET platform=EXCLUDED.platform, display_name=EXCLUDED.display_name, status=EXCLUDED.status, scopes=EXCLUDED.scopes, connected_at=EXCLUDED.connected_at, expires_at=EXCLUDED.expires_at, automation_enabled=EXCLUDED.automation_enabled, last_health_check_at=EXCLUDED.last_health_check_at, last_error=EXCLUDED.last_error`, [account.accountId, account.platform, account.displayName, account.status, JSON.stringify(account.scopes), account.connectedAt ?? null, account.expiresAt ?? null, account.automationEnabled, account.lastHealthCheckAt ?? null, account.lastError ?? null]).then(() => undefined)); }
  async deleteSocialAccount(accountId: string): Promise<void> { await this.withClient((client) => client.query("DELETE FROM marketing_hq_social_accounts WHERE account_id = $1", [accountId]).then(() => undefined)); }
  async loadSocialQueue(): Promise<SocialQueueItem[]> { return this.withClient(async (client) => { const result = await client.query("SELECT post_id, content_id, platform, format, text, scheduled_at, status, approval_request_id, created_at, updated_at, error FROM marketing_hq_social_queue ORDER BY created_at ASC"); return result.rows.map((row) => ({ postId: row.post_id, contentId: row.content_id, platform: row.platform, format: row.format, text: row.text, scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : undefined, status: row.status, approvalRequestId: row.approval_request_id ?? undefined, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(), error: row.error ?? undefined } as SocialQueueItem)); }); }
  async saveSocialQueue(item: SocialQueueItem): Promise<void> { await this.withClient((client) => client.query(`INSERT INTO marketing_hq_social_queue (post_id, content_id, platform, format, text, scheduled_at, status, approval_request_id, created_at, updated_at, error) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (post_id) DO UPDATE SET content_id=EXCLUDED.content_id, platform=EXCLUDED.platform, format=EXCLUDED.format, text=EXCLUDED.text, scheduled_at=EXCLUDED.scheduled_at, status=EXCLUDED.status, approval_request_id=EXCLUDED.approval_request_id, updated_at=EXCLUDED.updated_at, error=EXCLUDED.error`, [item.postId, item.contentId, item.platform, item.format, item.text, item.scheduledAt ?? null, item.status, item.approvalRequestId ?? null, item.createdAt, item.updatedAt, item.error ?? null]).then(() => undefined)); }
  async loadSocialAudit(): Promise<SocialAuditEntry[]> { return this.withClient(async (client) => { const result = await client.query("SELECT audit_id, post_id, account_id, action, actor, from_status, to_status, details, occurred_at FROM marketing_hq_social_audit ORDER BY occurred_at ASC"); return result.rows.map((row) => ({ auditId: row.audit_id, postId: row.post_id ?? undefined, accountId: row.account_id ?? undefined, action: row.action, actor: row.actor, fromStatus: row.from_status ?? undefined, toStatus: row.to_status ?? undefined, details: row.details, occurredAt: new Date(row.occurred_at).toISOString() } as SocialAuditEntry)); }); }
  async saveSocialAudit(entry: SocialAuditEntry): Promise<void> { await this.withClient((client) => client.query(`INSERT INTO marketing_hq_social_audit (audit_id, post_id, account_id, action, actor, from_status, to_status, details, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (audit_id) DO NOTHING`, [entry.auditId, entry.postId ?? null, entry.accountId ?? null, entry.action, entry.actor, entry.fromStatus ?? null, entry.toStatus ?? null, entry.details, entry.occurredAt]).then(() => undefined)); }
}
