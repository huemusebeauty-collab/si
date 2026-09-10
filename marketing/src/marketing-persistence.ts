import { Client } from "pg";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "./contracts";
import type { ApprovalRequest, AuditEvent } from "./marketing-security";

export interface MarketingPersistence {
  loadApprovals(): Promise<ApprovalRequest[]>;
  loadAudit(): Promise<AuditEvent[]>;
  saveApproval(request: ApprovalRequest): Promise<void>;
  saveAudit(event: AuditEvent): Promise<void>;
  cleanupE2E(target: string): Promise<void>;
}

export interface MarketingDomainPersistence {
  loadContent(): Promise<MarketingContent[]>;
  saveContent(content: MarketingContent): Promise<void>;
  loadCampaigns(): Promise<MarketingCampaign[]>;
  saveCampaign(campaign: MarketingCampaign): Promise<void>;
  loadJobs(): Promise<MarketingJob[]>;
  saveJob(job: MarketingJob): Promise<void>;
  loadDecisions(): Promise<MarketingDecisionRecord[]>;
  saveDecision(decision: MarketingDecisionRecord): Promise<void>;
  cleanupE2EDomain(target: string): Promise<void>;
}

export class NeonMarketingPersistence implements MarketingPersistence, MarketingDomainPersistence {
  private readonly databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;

  private async withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("Marketing HQ persistence database URL is not configured");
    const client = new Client({ connectionString: this.databaseUrl });
    await client.connect();
    try { return await work(client); } finally { await client.end(); }
  }

  async loadApprovals(): Promise<ApprovalRequest[]> {
    return this.withClient(async (client) => {
      const result = await client.query("SELECT request_id, action, actor, target, reason, created_at, decision, decided_at, decided_by FROM marketing_hq_approvals ORDER BY created_at ASC");
      return result.rows.map((row) => ({ requestId: row.request_id, action: row.action, actor: row.actor, target: row.target ?? undefined, reason: row.reason, createdAt: new Date(row.created_at).toISOString(), decision: row.decision ?? "pending", decidedAt: row.decided_at ? new Date(row.decided_at).toISOString() : undefined, decidedBy: row.decided_by ?? undefined } as ApprovalRequest));
    });
  }

  async loadAudit(): Promise<AuditEvent[]> {
    return this.withClient(async (client) => {
      const result = await client.query("SELECT event_id, action, actor, target, details, occurred_at FROM marketing_hq_audit_events ORDER BY occurred_at ASC");
      return result.rows.map((row) => ({ eventId: row.event_id, action: row.action, actor: row.actor, target: row.target ?? undefined, details: row.details, occurredAt: new Date(row.occurred_at).toISOString() } as AuditEvent));
    });
  }

  async saveApproval(request: ApprovalRequest): Promise<void> {
    await this.withClient((client) => client.query(`INSERT INTO marketing_hq_approvals (request_id, action, actor, target, reason, created_at, decision, decided_at, decided_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (request_id) DO UPDATE SET action=EXCLUDED.action, actor=EXCLUDED.actor, target=EXCLUDED.target, reason=EXCLUDED.reason, created_at=EXCLUDED.created_at, decision=EXCLUDED.decision, decided_at=EXCLUDED.decided_at, decided_by=EXCLUDED.decided_by`, [request.requestId, request.action, request.actor, request.target ?? null, request.reason, request.createdAt, request.decision, request.decidedAt ?? null, request.decidedBy ?? null]).then(() => undefined));
  }

  async saveAudit(event: AuditEvent): Promise<void> {
    await this.withClient((client) => client.query(`INSERT INTO marketing_hq_audit_events (event_id, action, actor, target, details, occurred_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (event_id) DO NOTHING`, [event.eventId, event.action, event.actor, event.target ?? null, event.details, event.occurredAt]).then(() => undefined));
  }

  async cleanupE2E(target: string): Promise<void> {
    await this.withClient(async (client) => {
      await client.query("BEGIN");
      try {
        await client.query("DELETE FROM marketing_hq_audit_events WHERE target = $1", [target]);
        await client.query("DELETE FROM marketing_hq_approvals WHERE target = $1", [target]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    });
  }

  async cleanupE2EDomain(target: string): Promise<void> {
    await this.withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const prefix = `${target}:%`;
        await client.query("DELETE FROM marketing_hq_decisions WHERE decision_id LIKE $1", [prefix]);
        await client.query("DELETE FROM marketing_hq_jobs WHERE job_id LIKE $1", [prefix]);
        await client.query("DELETE FROM marketing_hq_campaigns WHERE campaign_id LIKE $1", [prefix]);
        await client.query("DELETE FROM marketing_hq_content WHERE content_id LIKE $1", [prefix]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    });
  }

  async loadContent(): Promise<MarketingContent[]> {
    return this.withClient(async (client) => { const result = await client.query(`SELECT content_id, campaign_id, format, title, hook, body, call_to_action, status, platform, requires_approval, created_at, updated_at FROM marketing_hq_content ORDER BY created_at ASC`); return result.rows.map((row) => ({ contentId: row.content_id, campaignId: row.campaign_id ?? undefined, format: row.format, title: row.title ?? undefined, hook: row.hook, body: row.body, callToAction: row.call_to_action, status: row.status, platform: row.platform ?? undefined, requiresApproval: row.requires_approval, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() } as MarketingContent)); });
  }

  async saveContent(content: MarketingContent): Promise<void> { await this.withClient((client) => client.query(`INSERT INTO marketing_hq_content (content_id, campaign_id, format, title, hook, body, call_to_action, status, platform, requires_approval, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (content_id) DO UPDATE SET campaign_id=EXCLUDED.campaign_id, format=EXCLUDED.format, title=EXCLUDED.title, hook=EXCLUDED.hook, body=EXCLUDED.body, call_to_action=EXCLUDED.call_to_action, status=EXCLUDED.status, platform=EXCLUDED.platform, requires_approval=EXCLUDED.requires_approval, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`, [content.contentId, content.campaignId ?? null, content.format, content.title ?? null, content.hook, content.body, content.callToAction, content.status, content.platform ?? null, content.requiresApproval, content.createdAt, content.updatedAt]).then(() => undefined)); }

  async loadCampaigns(): Promise<MarketingCampaign[]> { return this.withClient(async (client) => { const result = await client.query(`SELECT campaign_id, name, objective, product_ids, audience, key_message, offer, start_at, end_at, status, created_at, updated_at FROM marketing_hq_campaigns ORDER BY created_at ASC`); return result.rows.map((row) => ({ campaignId: row.campaign_id, name: row.name, objective: row.objective, productIds: row.product_ids ?? [], audience: row.audience, keyMessage: row.key_message, offer: row.offer ?? undefined, startAt: row.start_at ? new Date(row.start_at).toISOString() : undefined, endAt: row.end_at ? new Date(row.end_at).toISOString() : undefined, status: row.status, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() } as MarketingCampaign)); }); }

  async saveCampaign(campaign: MarketingCampaign): Promise<void> { await this.withClient((client) => client.query(`INSERT INTO marketing_hq_campaigns (campaign_id, name, objective, product_ids, audience, key_message, offer, start_at, end_at, status, created_at, updated_at) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (campaign_id) DO UPDATE SET name=EXCLUDED.name, objective=EXCLUDED.objective, product_ids=EXCLUDED.product_ids, audience=EXCLUDED.audience, key_message=EXCLUDED.key_message, offer=EXCLUDED.offer, start_at=EXCLUDED.start_at, end_at=EXCLUDED.end_at, status=EXCLUDED.status, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`, [campaign.campaignId, campaign.name, campaign.objective, JSON.stringify(campaign.productIds), campaign.audience, campaign.keyMessage, campaign.offer ?? null, campaign.startAt ?? null, campaign.endAt ?? null, campaign.status, campaign.createdAt, campaign.updatedAt]).then(() => undefined)); }

  async loadJobs(): Promise<MarketingJob[]> { return this.withClient(async (client) => { const result = await client.query(`SELECT job_id, job_key, type, status, payload, retry_count, max_retries, scheduled_at, started_at, finished_at, error_code, error_message, created_at, updated_at FROM marketing_hq_jobs ORDER BY created_at ASC`); return result.rows.map((row) => ({ jobId: row.job_id, jobKey: row.job_key, type: row.type, status: row.status, payload: row.payload ?? {}, retryCount: row.retry_count, maxRetries: row.max_retries, scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : undefined, startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined, finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : undefined, errorCode: row.error_code ?? undefined, errorMessage: row.error_message ?? undefined, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() } as MarketingJob)); }); }

  async saveJob(job: MarketingJob): Promise<void> { await this.withClient((client) => client.query(`INSERT INTO marketing_hq_jobs (job_id, job_key, type, status, payload, retry_count, max_retries, scheduled_at, started_at, finished_at, error_code, error_message, created_at, updated_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (job_id) DO UPDATE SET job_key=EXCLUDED.job_key, type=EXCLUDED.type, status=EXCLUDED.status, payload=EXCLUDED.payload, retry_count=EXCLUDED.retry_count, max_retries=EXCLUDED.max_retries, scheduled_at=EXCLUDED.scheduled_at, started_at=EXCLUDED.started_at, finished_at=EXCLUDED.finished_at, error_code=EXCLUDED.error_code, error_message=EXCLUDED.error_message, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`, [job.jobId, job.jobKey, job.type, job.status, JSON.stringify(job.payload), job.retryCount, job.maxRetries, job.scheduledAt ?? null, job.startedAt ?? null, job.finishedAt ?? null, job.errorCode ?? null, job.errorMessage ?? null, job.createdAt, job.updatedAt]).then(() => undefined)); }

  async loadDecisions(): Promise<MarketingDecisionRecord[]> { return this.withClient(async (client) => { const result = await client.query(`SELECT decision_id, action, actor, target, reason, confidence, requires_approval, status, evidence, approval_request_id, created_at, decided_at, executed_at, error_message FROM marketing_hq_decisions ORDER BY created_at ASC`); return result.rows.map((row) => ({ decisionId: row.decision_id, action: row.action, actor: row.actor, target: row.target ?? undefined, reason: row.reason, confidence: Number(row.confidence), requiresApproval: row.requires_approval, status: row.status, evidence: row.evidence ?? [], approvalRequestId: row.approval_request_id ?? undefined, createdAt: new Date(row.created_at).toISOString(), decidedAt: row.decided_at ? new Date(row.decided_at).toISOString() : undefined, executedAt: row.executed_at ? new Date(row.executed_at).toISOString() : undefined, errorMessage: row.error_message ?? undefined } as MarketingDecisionRecord)); }); }

  async saveDecision(decision: MarketingDecisionRecord): Promise<void> { await this.withClient((client) => client.query(`INSERT INTO marketing_hq_decisions (decision_id, action, actor, target, reason, confidence, requires_approval, status, evidence, approval_request_id, created_at, decided_at, executed_at, error_message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14) ON CONFLICT (decision_id) DO UPDATE SET action=EXCLUDED.action, actor=EXCLUDED.actor, target=EXCLUDED.target, reason=EXCLUDED.reason, confidence=EXCLUDED.confidence, requires_approval=EXCLUDED.requires_approval, status=EXCLUDED.status, evidence=EXCLUDED.evidence, approval_request_id=EXCLUDED.approval_request_id, created_at=EXCLUDED.created_at, decided_at=EXCLUDED.decided_at, executed_at=EXCLUDED.executed_at, error_message=EXCLUDED.error_message`, [decision.decisionId, decision.action, decision.actor, decision.target ?? null, decision.reason, decision.confidence, decision.requiresApproval, decision.status, JSON.stringify(decision.evidence), decision.approvalRequestId ?? null, decision.createdAt, decision.decidedAt ?? null, decision.executedAt ?? null, decision.errorMessage ?? null]).then(() => undefined)); }
}