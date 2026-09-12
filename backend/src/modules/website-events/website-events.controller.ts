import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators/public.decorator";
import { TrackWebsiteEventDto } from "./dto/track-website-event.dto";
import { WebsiteEventsService } from "./website-events.service";

@ApiTags("website-events")
// Keep this collector path explicit: the storefront sends events to
// /v1/website/events, and this route must not depend on Nest URI-version
// prefixing semantics for the public telemetry collector.
@Controller("v1/website/events")
export class WebsiteEventsController {
  constructor(private readonly websiteEvents: WebsiteEventsService) {}

  @Public()
  @Post()
  track(@Body() dto: TrackWebsiteEventDto) {
    return this.websiteEvents.track(dto);
  }
}
