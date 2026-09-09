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

@Module({
  imports: [TypeOrmModule.forFeature([WebsiteEventEntity])],
  controllers: [WebsiteEventsController, WebsiteFunnelController, ProductConversionController, CustomerJourneyController],
  providers: [WebsiteEventsService, WebsiteFunnelService, ProductConversionService, CustomerJourneyService],
  exports: [WebsiteEventsService, WebsiteFunnelService, ProductConversionService, CustomerJourneyService],
})
export class WebsiteEventsModule {}
