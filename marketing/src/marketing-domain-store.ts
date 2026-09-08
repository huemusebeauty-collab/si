import type {
  MarketingCampaign,
  MarketingContent,
  MarketingDecisionRecord,
  MarketingJob,
} from "./contracts";
import type { MarketingDomainPersistence } from "./marketing-persistence";

export class MarketingDomainStore {
  private readonly content = new Map<string, MarketingContent>();
  private readonly campaigns = new Map<string, MarketingCampaign>();
  private readonly jobs = new Map<string, MarketingJob>();
  private readonly decisions = new Map<string, MarketingDecisionRecord>();

  constructor(private readonly persistence?: MarketingDomainPersistence) {}

  async hydrate(): Promise<void> {
    if (!this.persistence) return;
    const [content, campaigns, jobs, decisions] = await Promise.all([
      this.persistence.loadContent(),
      this.persistence.loadCampaigns(),
      this.persistence.loadJobs(),
      this.persistence.loadDecisions(),
    ]);
    this.content.clear();
    this.campaigns.clear();
    this.jobs.clear();
    this.decisions.clear();
    for (const item of content) this.content.set(item.contentId, item);
    for (const item of campaigns) this.campaigns.set(item.campaignId, item);
    for (const item of jobs) this.jobs.set(item.jobId, item);
    for (const item of decisions) this.decisions.set(item.decisionId, item);
  }

  async saveContent(item: MarketingContent): Promise<MarketingContent> {
    this.content.set(item.contentId, item);
    if (this.persistence) await this.persistence.saveContent(item);
    return item;
  }

  async saveCampaign(item: MarketingCampaign): Promise<MarketingCampaign> {
    this.campaigns.set(item.campaignId, item);
    if (this.persistence) await this.persistence.saveCampaign(item);
    return item;
  }

  async saveJob(item: MarketingJob): Promise<MarketingJob> {
    this.jobs.set(item.jobId, item);
    if (this.persistence) await this.persistence.saveJob(item);
    return item;
  }

  async saveDecision(item: MarketingDecisionRecord): Promise<MarketingDecisionRecord> {
    this.decisions.set(item.decisionId, item);
    if (this.persistence) await this.persistence.saveDecision(item);
    return item;
  }

  getContent(contentId: string): MarketingContent | undefined { return this.content.get(contentId); }
  getCampaign(campaignId: string): MarketingCampaign | undefined { return this.campaigns.get(campaignId); }
  getJob(jobId: string): MarketingJob | undefined { return this.jobs.get(jobId); }
  getDecision(decisionId: string): MarketingDecisionRecord | undefined { return this.decisions.get(decisionId); }

  listContent(): MarketingContent[] { return [...this.content.values()]; }
  listCampaigns(): MarketingCampaign[] { return [...this.campaigns.values()]; }
  listJobs(): MarketingJob[] { return [...this.jobs.values()]; }
  listDecisions(): MarketingDecisionRecord[] { return [...this.decisions.values()]; }

  summary() {
    return {
      content: this.content.size,
      campaigns: this.campaigns.size,
      jobs: this.jobs.size,
      decisions: this.decisions.size,
    };
  }
}
