import type { CreatorPersistence } from "./creator-persistence";

export type CreatorStatus =
  | "prospect"
  | "contacted"
  | "interested"
  | "negotiating"
  | "approved"
  | "sample_sent"
  | "content_pending"
  | "published"
  | "performing"
  | "repeat_collaboration";

export interface CreatorProfile {
  creatorId: string;
  displayName: string;
  handle: string;
  platform: "instagram" | "youtube" | "facebook" | "pinterest" | "x";
  beautyFocus: string[];
  followers?: number;
  averageViews?: number;
  engagementRate?: number;
  audienceFitScore?: number;
  authenticityScore?: number;
  conversionScore?: number;
  creatorScore?: number;
  publicContact?: string;
  status: CreatorStatus;
  productsSent: string[];
  publishedContentIds: string[];
  revenueAttributed?: number;
}

export interface SampleKit {
  kitId: string;
  creatorId: string;
  productIds: string[];
  approved: boolean;
  shipmentStatus: "pending" | "approved" | "sent" | "delivered";
  trackingReference?: string;
}

export class CreatorCollaborationEngine {
  private readonly creators = new Map<string, CreatorProfile>();
  private readonly sampleKits = new Map<string, SampleKit>();

  constructor(private readonly persistence?: CreatorPersistence) {}

  async hydrate(): Promise<void> {
    if (!this.persistence) return;
    const [creators, kits] = await Promise.all([this.persistence.loadCreators(), this.persistence.loadSampleKits()]);
    this.creators.clear();
    this.sampleKits.clear();
    for (const creator of creators) this.creators.set(creator.creatorId, { ...creator, beautyFocus: [...creator.beautyFocus], productsSent: [...creator.productsSent], publishedContentIds: [...creator.publishedContentIds] });
    for (const kit of kits) this.sampleKits.set(kit.kitId, { ...kit, productIds: [...kit.productIds] });
  }

  async flushPersistence(): Promise<void> {
    if (!this.persistence) return;
    await Promise.all([
      ...[...this.creators.values()].map((creator) => this.persistence!.saveCreator(creator)),
      ...[...this.sampleKits.values()].map((kit) => this.persistence!.saveSampleKit(kit)),
    ]);
  }

  listSampleKits(): SampleKit[] {
    return [...this.sampleKits.values()].map((kit) => ({ ...kit, productIds: [...kit.productIds] }));
  }

  addCreator(creator: CreatorProfile): CreatorProfile {
    const scored = {
      ...creator,
      creatorScore: this.scoreCreator(creator),
    };
    this.creators.set(creator.creatorId, scored);
    void this.persistence?.saveCreator(scored);
    return scored;
  }

  getCreator(creatorId: string): CreatorProfile | undefined {
    return this.creators.get(creatorId);
  }

  rankCreators(limit = 20): CreatorProfile[] {
    return [...this.creators.values()]
      .sort((a, b) => (b.creatorScore ?? 0) - (a.creatorScore ?? 0))
      .slice(0, limit);
  }

  updateStatus(creatorId: string, status: CreatorStatus): CreatorProfile | undefined {
    const creator = this.creators.get(creatorId);
    if (!creator) return undefined;
    const updated = { ...creator, status };
    this.creators.set(creatorId, updated);
    void this.persistence?.saveCreator(updated);
    return updated;
  }

  createSampleKit(creatorId: string, productIds: string[], approved = false): SampleKit {
    const kit: SampleKit = {
      kitId: `${creatorId}:${Date.now()}`,
      creatorId,
      productIds: [...productIds],
      approved,
      shipmentStatus: approved ? "approved" : "pending",
    };
    this.sampleKits.set(kit.kitId, kit);
    void this.persistence?.saveSampleKit(kit);
    return kit;
  }

  approveSampleKit(kitId: string): SampleKit | undefined {
    const kit = this.sampleKits.get(kitId);
    if (!kit) return undefined;
    const updated = { ...kit, approved: true, shipmentStatus: "approved" as const };
    this.sampleKits.set(kitId, updated);
    void this.persistence?.saveSampleKit(updated);
    return updated;
  }

  private scoreCreator(creator: CreatorProfile): number {
    const engagement = Math.min(100, (creator.engagementRate ?? 0) * 10);
    const audience = creator.audienceFitScore ?? 0;
    const authenticity = creator.authenticityScore ?? 0;
    const conversion = creator.conversionScore ?? 0;
    const views = Math.min(100, ((creator.averageViews ?? 0) / Math.max(1, creator.followers ?? 1)) * 100);
    return Math.round((engagement * 0.25 + audience * 0.3 + authenticity * 0.2 + conversion * 0.2 + views * 0.05) * 100) / 100;
  }
}
