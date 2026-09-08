import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators/public.decorator";
import { TrackWebsiteEventDto } from "./dto/track-website-event.dto";
import { WebsiteEventsService } from "./website-events.service";

@ApiTags("website-events")
@Controller({ path: "website/events", version: "1" })
export class WebsiteEventsController {
  constructor(private readonly websiteEvents: WebsiteEventsService) {}

  @Public()
  @Post()
  track(@Body() dto: TrackWebsiteEventDto) {
    return this.websiteEvents.track(dto);
  }
}
