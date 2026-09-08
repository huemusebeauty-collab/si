import type { MarketingPlatform } from "./platform-adapters";

export type AutomationMode = "running" | "paused" | "stopped";

export interface SocialAutomationConfig {
  mode: AutomationMode;
  platforms: MarketingPlatform[];
  autoPublishApprovedContent: boolean;
  autoOptimize: boolean;
  growthObjective: "followers" | "views" | "engagement" | "conversions";
  maxPostsPerDay: number;
  dailyAdBudgetInr: number;
  requireApprovalForAds: boolean;
}

export interface SocialAutomationStatus {
  mode: AutomationMode;
  platforms: MarketingPlatform[];
  objective: SocialAutomationConfig["growthObjective"];
  lastActionAt?: string;
  nextActionAt?: string;
}

export class SocialAutomationControl {
  private config: SocialAutomationConfig = {
    mode: "paused",
    platforms: ["instagram", "facebook", "youtube", "pinterest", "x", "whatsapp"],
    autoPublishApprovedContent: true,
    autoOptimize: true,
    growthObjective: "conversions",
    maxPostsPerDay: 6,
    dailyAdBudgetInr: 0,
    requireApprovalForAds: true,
  };

  start(): SocialAutomationConfig {
    this.config = { ...this.config, mode: "running" };
    return this.getConfig();
  }

  pause(): SocialAutomationConfig {
    this.config = { ...this.config, mode: "paused" };
    return this.getConfig();
  }

  stop(): SocialAutomationConfig {
    this.config = { ...this.config, mode: "stopped" };
    return this.getConfig();
  }

  update(patch: Partial<Omit<SocialAutomationConfig, "mode">>): SocialAutomationConfig {
    if (patch.maxPostsPerDay !== undefined && (!Number.isInteger(patch.maxPostsPerDay) || patch.maxPostsPerDay < 0 || patch.maxPostsPerDay > 50)) {
      throw new Error("maxPostsPerDay must be an integer from 0 to 50.");
    }
    if (patch.dailyAdBudgetInr !== undefined && (!Number.isFinite(patch.dailyAdBudgetInr) || patch.dailyAdBudgetInr < 0)) {
      throw new Error("dailyAdBudgetInr must be a non-negative number.");
    }
    this.config = { ...this.config, ...patch };
    return this.getConfig();
  }

  getConfig(): SocialAutomationConfig {
    return { ...this.config, platforms: [...this.config.platforms] };
  }

  status(): SocialAutomationStatus {
    return {
      mode: this.config.mode,
      platforms: [...this.config.platforms],
      objective: this.config.growthObjective,
    };
  }

  canAutoPublish(): boolean {
    return this.config.mode === "running" && this.config.autoPublishApprovedContent;
  }

  /**
   * Growth is optimized through legitimate content, audience fit and conversion signals.
   * The engine must not use fake followers, fake views, bots, engagement manipulation or spam.
   */
  growthGuardrails(): string[] {
    return [
      "Use platform-approved APIs and account permissions.",
      "Publish only approved content when auto-publish is enabled.",
      "Respect platform rate limits, policies and audience consent.",
      "Never purchase or generate fake followers, views or engagement.",
      "Pause automation immediately when the owner requests it.",
      "Require explicit approval before paid advertising spend.",
    ];
  }
}
