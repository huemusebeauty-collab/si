import { Controller, Get, Query } from "@nestjs/common";
import { WebsiteFunnelService } from "./website-funnel.service";

@Controller({ path: "website/analytics", version: "1" })
export class WebsiteFunnelController {
  constructor(private readonly funnel: WebsiteFunnelService) {}

  @Get("funnel")
  getFunnel(@Query("days") days?: string) {
    return this.funnel.getFunnel(days ? Number(days) : 30);
  }
}
