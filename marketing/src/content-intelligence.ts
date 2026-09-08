export type ContentFormat = "reel" | "story" | "short" | "post" | "carousel" | "pinterest" | "whatsapp" | "blog" | "banner" | "ad";
export type ContentObjective = "awareness" | "conversion" | "retention" | "b2b";

export interface ContentSource {
  campaignId: string;
  productIds: string[];
  category?: string;
  objective: ContentObjective;
  keyMessage: string;
  facts: string[];
  offer?: string;
}

export interface ContentVariant {
  format: ContentFormat;
  title: string;
  hook: string;
  body: string;
  callToAction: string;
  language: string;
  requiresApproval: boolean;
}

export interface ContentPlan {
  campaignId: string;
  variants: ContentVariant[];
  generatedAt: string;
}

const FORMAT_GUIDANCE: Record<ContentFormat, string> = {
  reel: "Fast hook, visual-first story, concise CTA",
  story: "Short conversational frames with one clear action",
  short: "Strong first-second hook and compact payoff",
  post: "Readable caption with useful value and CTA",
  carousel: "Slide-by-slide education or product story",
  pinterest: "Search-friendly title and evergreen value",
  whatsapp: "Personal, concise message with a clear next step",
  blog: "Helpful long-form content with natural product context",
  banner: "Minimal headline and one clear CTA",
  ad: "Benefit-led copy; never invent claims; approval required",
};

export class ContentIntelligenceEngine {
  plan(source: ContentSource, formats: ContentFormat[], language = "en"): ContentPlan {
    if (!source.campaignId || !source.keyMessage) {
      throw new Error("campaignId and keyMessage are required");
    }

    const variants = formats.map((format) => ({
      format,
      title: source.category ? `${source.category} · Silku` : "Silku",
      hook: source.keyMessage,
      body: `${FORMAT_GUIDANCE[format]}. ${source.facts.slice(0, 2).join(" ")}`.trim(),
      callToAction: source.objective === "conversion" ? "Shop now" : "Discover Silku",
      language,
      requiresApproval: format === "ad",
    }));

    return {
      campaignId: source.campaignId,
      variants,
      generatedAt: new Date().toISOString(),
    };
  }
}
