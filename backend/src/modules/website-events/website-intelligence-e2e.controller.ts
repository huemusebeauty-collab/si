import { Controller, Get, Headers, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import { Public } from "@/common/decorators/public.decorator";
import { WebsiteEventEntity } from "./entities/website-event.entity";
import { WebsiteEventsService } from "./website-events.service";
import { WebsiteFunnelService } from "./website-funnel.service";
import { ProductConversionService } from "./product-conversion.service";
import { CustomerJourneyService } from "./customer-journey.service";
import { WebsiteChangeIntelligenceService } from "./website-change-intelligence.service";
import { CustomerProductOpportunityService } from "./customer-product-opportunity.service";

@Controller({ path: "website/analytics/e2e", version: "1" })
export class WebsiteIntelligenceE2eController {
  constructor(
    @InjectRepository(WebsiteEventEntity)
    private readonly events: Repository<WebsiteEventEntity>,
    private readonly websiteEvents: WebsiteEventsService,
    private readonly funnel: WebsiteFunnelService,
    private readonly productConversion: ProductConversionService,
    private readonly journey: CustomerJourneyService,
    private readonly changes: WebsiteChangeIntelligenceService,
    private readonly opportunities: CustomerProductOpportunityService,
  ) {}

  @Public()
  @Get()
  async run(@Headers("x-silku-hq-internal-token") token?: string) {
    const expected = process.env.MARKETING_HQ_INTERNAL_TOKEN;
    if (!expected || token !== expected) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);

    const id = randomUUID();
    const sessionId = `website-e2e:${id}`;
    const anonymousId = `website-e2e:${id}`;
    const productId = `website-e2e-product:${id}`;
    const now = new Date();

    try {
      const event = async (eventName: "page_view" | "product_view" | "add_to_cart" | "begin_checkout" | "purchase", product?: string) =>
        this.websiteEvents.track({
          eventName,
          sessionId,
          anonymousId,
          path: product ? `/products/${product}` : "/",
          source: "e2e",
          medium: "test",
          campaign: "website-intelligence-e2e",
          productId: product,
          metadata: { e2e: true, e2eId: id },
          occurredAt: now.toISOString(),
        });

      await event("page_view");
      for (let i = 0; i < 6; i += 1) await event("product_view", productId);

      const [funnel, productConversion, journey, changes, opportunities] = await Promise.all([
        this.funnel.getFunnel(1),
        this.productConversion.getProductConversion(1),
        this.journey.getJourney(1),
        this.changes.getChanges(1),
        this.opportunities.getOpportunities(1),
      ]);

      const opportunity = opportunities.find((item) => item.productId === productId);
      const verified = {
        eventAccepted: true,
        funnelObserved: funnel.steps.some((step) => step.eventName === "product_view" && step.events >= 6),
        productConversionObserved: productConversion.some((item) => item.productId === productId && item.views >= 6),
        journeyObserved: journey.sessions >= 1 && journey.topJourneys.some((item) => item.path.includes("product_view")),
        websiteChangeObserved: changes.signals.some((signal) => signal.metric === "product_views" && signal.recent >= 6),
        opportunityRadarObserved: Boolean(opportunity && opportunity.score >= 70 && opportunity.priority === "high" && opportunity.recommendedAction === "improve_product_page"),
      };

      return {
        ok: Object.values(verified).every(Boolean),
        test: "website-intelligence-e2e",
        verified,
        opportunity: opportunity
          ? { productId: opportunity.productId, score: opportunity.score, priority: opportunity.priority, recommendedAction: opportunity.recommendedAction }
          : null,
        cleanedUp: true,
      };
    } finally {
      await this.events
        .createQueryBuilder()
        .delete()
        .from(WebsiteEventEntity)
        .where("session_id = :sessionId", { sessionId })
        .execute();
    }
  }
}
