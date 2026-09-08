import { Controller, Get, Headers, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Public } from "@/common/decorators/public.decorator";
import { OrdersService } from "./orders.service";

/**
 * Private service-to-service feed for Marketing HQ.
 * The route is @Public() only because the HQ uses a shared internal token,
 * not a customer JWT. It never exposes order/customer records directly.
 */
@Controller({ path: "marketing/commerce-intelligence", version: "1" })
export class MarketingCommerceController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Get()
  async getCommerceIntelligence(@Headers("x-silku-internal-token") token?: string) {
    const expected = process.env.MARKETING_HQ_INTERNAL_TOKEN;
    if (!expected || !token || !safeEqual(token, expected)) {
      throw new UnauthorizedException("Invalid internal service token.");
    }
    return this.orders.getMarketingCommerceIntelligence();
  }
}

function safeEqual(a: string, b: string): boolean {
  const aHash = createHmac("sha256", "silku-internal-token").update(a).digest();
  const bHash = createHmac("sha256", "silku-internal-token").update(b).digest();
  return timingSafeEqual(aHash, bHash);
}
