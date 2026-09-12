import { Body, Controller, Post, VERSION_NEUTRAL, Version } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators/public.decorator";
import { TrackWebsiteEventDto } from "./dto/track-website-event.dto";
import { WebsiteEventsService } from "./website-events.service";

@ApiTags("website-events")
// Keep the collector at exactly /v1/website/events while the application
// uses URI versioning globally. VERSION_NEUTRAL prevents Nest from adding
// a second /v1 prefix to this explicitly-versioned collector path.
@Controller("v1/website/events")
export class WebsiteEventsController {
  constructor(private readonly websiteEvents: WebsiteEventsService) {}

  @Public()
  @Version(VERSION_NEUTRAL)
  @Post()
  track(@Body() dto: TrackWebsiteEventDto) {
    return this.websiteEvents.track(dto);
  }
}
