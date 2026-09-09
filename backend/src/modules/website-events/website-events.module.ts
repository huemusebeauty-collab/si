import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebsiteEventEntity } from "./entities/website-event.entity";
import { WebsiteEventsController } from "./website-events.controller";
import { WebsiteEventsService } from "./website-events.service";
import { WebsiteFunnelController } from "./website-funnel.controller";
import { WebsiteFunnelService } from "./website-funnel.service";

@Module({
  imports: [TypeOrmModule.forFeature([WebsiteEventEntity])],
  controllers: [WebsiteEventsController, WebsiteFunnelController],
  providers: [WebsiteEventsService, WebsiteFunnelService],
  exports: [WebsiteEventsService, WebsiteFunnelService],
})
export class WebsiteEventsModule {}
