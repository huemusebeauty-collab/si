import { Controller, Get, Query } from "@nestjs/common";
import { CustomerProductOpportunityService } from "./customer-product-opportunity.service";

@Controller({ path: "website/analytics/opportunities", version: "1" })
export class CustomerProductOpportunityController {
  constructor(private readonly opportunities: CustomerProductOpportunityService) {}

  @Get()
  getOpportunities(@Query("days") days?: string) {
    return this.opportunities.getOpportunities(days ? Number(days) : 30);
  }
}
