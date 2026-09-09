import { Controller, Get, Query } from "@nestjs/common";
import { WebsiteChangeIntelligenceService } from "./website-change-intelligence.service";

@Controller("/v1/website/analytics/changes")
export class WebsiteChangeIntelligenceController {
  constructor(private readonly changes: WebsiteChangeIntelligenceService) {}

  @Get()
  async getChanges(@Query("days") days?: string) {
    return this.changes.getChanges(Number(days));
  }
}
