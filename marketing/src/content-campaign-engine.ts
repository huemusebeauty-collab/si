export type ContentFormat =
  | "reel" | "story" | "short" | "post" | "carousel"
  | "pinterest" | "whatsapp" | "blog" | "website_banner" | "ad";

export type ContentStatus = "idea" | "draft" | "qa_passed" | "approved" | "scheduled" | "published" | "rejected";

export interface CampaignBrief {
  campaignId: string;
  name: string;
  objective: "awareness" | "engagement" | "traffic" | "conversion" | "retention" | "b2b";
  productIds: string[];
  audience: string;
  offer?: string;
  keyMessage: string;
  startAt?: string;
  endAt?: string;
}

export interface ContentVariant {
  contentId: string;
  campaignId: string;
  format: ContentFormat;
  hook: string;
  body: string;
  callToAction: string;
  status: ContentStatus;
  platform?: string;
  requiresApproval: boolean;
}

export class ContentCampaignEngine {
  private readonly campaigns = new Map<string, CampaignBrief>();
  private readonly content = new Map<string, ContentVariant>();

  createCampaign(brief: CampaignBrief): CampaignBrief {
    this.campaigns.set(brief.campaignId, { ...brief, productIds: [...brief.productIds] });
    return brief;
  }

  getCampaign(campaignId: string): CampaignBrief | undefined {
    return this.campaigns.get(campaignId);
  }

  createVariant(variant: ContentVariant): ContentVariant {
    const normalized = {
      ...variant,
      requiresApproval: variant.requiresApproval || variant.format === "ad",
    };
    this.content.set(normalized.contentId, normalized);
    return normalized;
  }

  listCampaignContent(campaignId: string): ContentVariant[] {
    return [...this.content.values()].filter((item) => item.campaignId === campaignId);
  }

  approve(contentId: string): ContentVariant | undefined {
    const current = this.content.get(contentId);
    if (!current) return undefined;
    const updated = { ...current, status: "approved" as const };
    this.content.set(contentId, updated);
    return updated;
  }

  reject(contentId: string): ContentVariant | undefined {
    const current = this.content.get(contentId);
    if (!current) return undefined;
    const updated = { ...current, status: "rejected" as const };
    this.content.set(contentId, updated);
    return updated;
  }
}
