import { AdsEngine } from "./ads-engine";
import { LearningEngine } from "./learning-engine";
import { MarketingDirector, MarketingDirectorContext } from "./marketing-director";
import { NextBestActionEngine, NextBestActionInput } from "./next-best-action";

export interface MarketingHQSnapshot {
  decision: ReturnType<MarketingDirector["decide"]>;
  nextBestAction: ReturnType<NextBestActionEngine["decide"]>;
  learning: ReturnType<LearningEngine["learn"]>;
  generatedAt: string;
}

export class MarketingHQOrchestrator {
  private readonly director = new MarketingDirector();
  private readonly nextBestAction = new NextBestActionEngine();
  private readonly learning = new LearningEngine();
  private readonly ads = new AdsEngine();

  evaluate(context: NextBestActionInput): MarketingHQSnapshot {
    const decision = this.director.decide(context);
    const nextBestAction = this.nextBestAction.decide(context);
    return {
      decision,
      nextBestAction,
      learning: this.learning.learn(),
      generatedAt: new Date().toISOString(),
    };
  }

  recordLearning(input: Parameters<LearningEngine["record"]>[0]): void {
    this.learning.record(input);
  }

  createAdDraft(input: Parameters<AdsEngine["createDraft"]>[0]) {
    return this.ads.createDraft(input);
  }

  approveAd(campaignId: string) {
    return this.ads.approve(campaignId);
  }

  rejectAd(campaignId: string) {
    return this.ads.reject(campaignId);
  }
}
