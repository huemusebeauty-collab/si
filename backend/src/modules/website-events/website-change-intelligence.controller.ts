import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "@/common/decorators/public.decorator";
import { WebsiteChangeIntelligenceService } from "./website-change-intelligence.service";

// URI versioning is enabled globally in main.ts, so the /v1 prefix is
// supplied by Nest itself. Keeping it out of @Controller avoids exposing
// this endpoint as /v1/v1/website/analytics/changes.
@Controller("website/analytics/changes")
export class WebsiteChangeIntelligenceController {
  constructor(private readonly changes: WebsiteChangeIntelligenceService) {}

  @Public()
  @Get()
  async getChanges(@Query("days") days?: string) {
    return this.changes.getChanges(Number(days));
  }
}
