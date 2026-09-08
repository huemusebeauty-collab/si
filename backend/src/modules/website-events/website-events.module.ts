import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebsiteEventEntity } from "./entities/website-event.entity";
import { WebsiteEventsController } from "./website-events.controller";
import { WebsiteEventsService } from "./website-events.service";

@Module({
  imports: [TypeOrmModule.forFeature([WebsiteEventEntity])],
  controllers: [WebsiteEventsController],
  providers: [WebsiteEventsService],
  exports: [WebsiteEventsService],
})
export class WebsiteEventsModule {}
