import { MarketingIntelligenceInput, MarketingIntelligenceSnapshot, MarketingIntelligenceOrchestrator } from "./marketing-intelligence-orchestrator";

export interface MarketingApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  generatedAt: string;
}

export class MarketingApiGateway {
  constructor(private readonly orchestrator = new MarketingIntelligenceOrchestrator()) {}

  evaluate(input: MarketingIntelligenceInput): MarketingApiResponse<MarketingIntelligenceSnapshot> {
    try {
      return { ok: true, data: this.orchestrator.evaluate(input), generatedAt: new Date().toISOString() };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Marketing evaluation failed",
        generatedAt: new Date().toISOString(),
      };
    }
  }

  status(): MarketingApiResponse<{ service: "marketing-hq"; healthy: true; generatedAt: string }> {
    const generatedAt = new Date().toISOString();
    return {
      ok: true,
      data: { service: "marketing-hq", healthy: true, generatedAt },
      generatedAt,
    };
  }

  recordLearning(observation: Parameters<MarketingIntelligenceOrchestrator["recordLearning"]>[0]): MarketingApiResponse<null> {
    try {
      this.orchestrator.recordLearning(observation);
      return { ok: true, data: null, generatedAt: new Date().toISOString() };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Learning record failed", generatedAt: new Date().toISOString() };
    }
  }

  recordConversion(event: Parameters<MarketingIntelligenceOrchestrator["recordConversion"]>[0]): MarketingApiResponse<null> {
    try {
      this.orchestrator.recordConversion(event);
      return { ok: true, data: null, generatedAt: new Date().toISOString() };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Conversion record failed", generatedAt: new Date().toISOString() };
    }
  }
}
