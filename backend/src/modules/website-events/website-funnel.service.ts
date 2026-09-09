import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebsiteEventEntity } from "./entities/website-event.entity";

export type WebsiteFunnelStep = {
  eventName: "page_view" | "product_view" | "add_to_cart" | "begin_checkout" | "purchase";
  events: number;
  sessions: number;
};

export type WebsiteFunnelSummary = {
  windowDays: number;
  from: string;
  to: string;
  steps: WebsiteFunnelStep[];
  conversionRate: number;
  cartRate: number;
  checkoutRate: number;
  purchaseRate: number;
};

@Injectable()
export class WebsiteFunnelService {
  constructor(
    @InjectRepository(WebsiteEventEntity)
    private readonly events: Repository<WebsiteEventEntity>,
  ) {}

  async getFunnel(windowDays = 30): Promise<WebsiteFunnelSummary> {
    const safeDays = Math.min(Math.max(Math.floor(windowDays) || 30, 1), 90);
    const rows = await this.events
      .createQueryBuilder("event")
      .select("event.eventName", "eventName")
      .addSelect("COUNT(*)", "events")
      .addSelect("COUNT(DISTINCT event.sessionId)", "sessions")
      .where("event.occurredAt >= NOW() - (:days * INTERVAL '1 day')", { days: safeDays })
      .groupBy("event.eventName")
      .getRawMany<{ eventName: WebsiteFunnelStep["eventName"]; events: string; sessions: string }>();

    const byName = new Map(rows.map((row) => [row.eventName, row]));
    const names: WebsiteFunnelStep["eventName"][] = [
      "page_view",
      "product_view",
      "add_to_cart",
      "begin_checkout",
      "purchase",
    ];
    const steps = names.map((eventName) => ({
      eventName,
      events: Number(byName.get(eventName)?.events ?? 0),
      sessions: Number(byName.get(eventName)?.sessions ?? 0),
    }));

    const pageSessions = steps[0].sessions;
    const cartSessions = steps[2].sessions;
    const checkoutSessions = steps[3].sessions;
    const purchaseSessions = steps[4].sessions;

    return {
      windowDays: safeDays,
      from: new Date(Date.now() - safeDays * 86_400_000).toISOString(),
      to: new Date().toISOString(),
      steps,
      conversionRate: pageSessions ? Number(((purchaseSessions / pageSessions) * 100).toFixed(2)) : 0,
      cartRate: pageSessions ? Number(((cartSessions / pageSessions) * 100).toFixed(2)) : 0,
      checkoutRate: cartSessions ? Number(((checkoutSessions / cartSessions) * 100).toFixed(2)) : 0,
      purchaseRate: checkoutSessions ? Number(((purchaseSessions / checkoutSessions) * 100).toFixed(2)) : 0,
    };
  }
}
