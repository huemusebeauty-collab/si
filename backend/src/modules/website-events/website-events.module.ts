import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebsiteEventEntity } from "./entities/website-event.entity";
import { WebsiteEventsController } from "./website-events.controller";
import { WebsiteEventsService } from "./website-events.service";
import { WebsiteFunnelController } from "./website-funnel.controller";
import { WebsiteFunnelService } from "./website-funnel.service";
import { ProductConversionController } from "./product-conversion.controller";
import { ProductConversionService } from "./product-conversion.service";
import { CustomerJourneyController } from "./customer-journey.controller";
import { CustomerJourneyService } from "./customer-journey.service";
import { WebsiteChangeIntelligenceController } from "./website-change-intelligence.controller";
import { WebsiteChangeIntelligenceService } from "./website-change-intelligence.service";
import { CustomerProductOpportunityController } from "./customer-product-opportunity.controller";
import { CustomerProductOpportunityService } from "./customer-product-opportunity.service";
import { WebsiteIntelligenceE2eController } from "./website-intelligence-e2e.controller";

@Module({
  imports: [TypeOrmModule.forFeature([WebsiteEventEntity])],
  controllers: [
    WebsiteEventsController,
    WebsiteFunnelController,
    ProductConversionController,
    CustomerJourneyController,
    WebsiteChangeIntelligenceController,
    CustomerProductOpportunityController,
    WebsiteIntelligenceE2eController,
  ],
  providers: [
    WebsiteEventsService,
    WebsiteFunnelService,
    ProductConversionService,
    CustomerJourneyService,
    WebsiteChangeIntelligenceService,
    CustomerProductOpportunityService,
  ],
  exports: [
    WebsiteEventsService,
    WebsiteFunnelService,
    ProductConversionService,
    CustomerJourneyService,
    WebsiteChangeIntelligenceService,
    CustomerProductOpportunityService,
  ],
})
export class WebsiteEventsModule {}
