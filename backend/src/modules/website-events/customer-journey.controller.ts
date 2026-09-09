import { Controller, Get, Query } from "@nestjs/common";
import { CustomerJourneyService } from "./customer-journey.service";

@Controller("/v1/website/analytics/journey")
export class CustomerJourneyController {
  constructor(private readonly journey: CustomerJourneyService) {}

  @Get()
  async getJourney(@Query("days") days?: string) {
    return this.journey.getJourney(Number(days));
  }
}
