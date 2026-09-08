import { MarketingDirectorContext, MarketingDecision, MarketingDirector } from "./marketing-director";
import { NextBestActionEngine, NextBestActionInput, NextBestAction } from "./next-best-action";
import { LearningEngine, LearningInsight } from "./learning-engine";
import { ConversionIntelligenceEngine, ConversionInsight } from "./conversion-intelligence";
import { AnalyticsCommandCenter, AnalyticsInput, AnalyticsSnapshot } from "./analytics-command-center";

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
