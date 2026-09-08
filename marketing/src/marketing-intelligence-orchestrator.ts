import type { MarketingDecision } from "./contracts";
import { MarketingDirector, type MarketingDirectorContext } from "./marketing-director";
import { NextBestActionEngine, type NextBestActionInput, type NextBestAction } from "./next-best-action";
import { LearningEngine, type LearningInsight } from "./learning-engine";
import { ConversionIntelligenceEngine, type ConversionInsight } from "./conversion-intelligence";
import { AnalyticsCommandCenter, type AnalyticsInput, type AnalyticsSnapshot } from "./analytics-command-center";

export interface MarketingIntelligenceInput extends MarketingDirectorContext {
  learningScore: number;
  topAttributedSource?: string;
  availableBudget: number;
  analytics: AnalyticsInput;
}

export interface MarketingIntelligenceSnapshot {
  decision: MarketingDecision;
  nextBestAction: NextBestAction;
  learningInsights: LearningInsight[];
  conversionInsights: ConversionInsight[];
  analytics: AnalyticsSnapshot;
  generatedAt: string;
}

export class MarketingIntelligenceOrchestrator {
  constructor(
    private readonly director = new MarketingDirector(),
    private readonly nextAction = new NextBestActionEngine(),
    private readonly learning = new LearningEngine(),
    private readonly conversion = new ConversionIntelligenceEngine(),
    private readonly analytics = new AnalyticsCommandCenter(),
  ) {}

  evaluate(input: MarketingIntelligenceInput): MarketingIntelligenceSnapshot {
    const decision = this.director.decide(input);
    const nextBestAction = this.nextAction.decide(input as NextBestActionInput);
    const learningInsights = this.learning.learn();
    const conversionInsights = this.conversion.analyze();
    const analytics = this.analytics.summarize(input.analytics);

    return {
      decision,
      nextBestAction,
      learningInsights,
      conversionInsights,
      analytics,
      generatedAt: new Date().toISOString(),
    };
  }

  recordLearning(observation: Parameters<LearningEngine["record"]>[0]): void {
    this.learning.record(observation);
  }

  recordConversion(event: Parameters<ConversionIntelligenceEngine["record"]>[0]): void {
    this.conversion.record(event);
  }
}
