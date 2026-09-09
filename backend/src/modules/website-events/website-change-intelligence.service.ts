import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebsiteEventEntity } from "./entities/website-event.entity";

export type WebsiteChangeSignal = {
  metric: "sessions" | "product_views" | "add_to_carts" | "checkouts" | "purchases";
  recent: number;
  previous: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  significance: "high" | "medium" | "low";
};

@Injectable()
export class WebsiteChangeIntelligenceService {
  constructor(
    @InjectRepository(WebsiteEventEntity)
    private readonly events: Repository<WebsiteEventEntity>,
  ) {}

  async getChanges(windowDays = 7): Promise<{ windowDays: number; signals: WebsiteChangeSignal[] }> {
    const days = Math.min(Math.max(Math.floor(windowDays) || 7, 1), 30);
    const rows = await this.events
      .createQueryBuilder("event")
      .select(["event.eventName", "event.sessionId", "event.occurredAt"])
      .where("event.occurredAt >= NOW() - (:days * INTERVAL '1 day')", { days: days * 2 })
      .getMany();

    const split = Date.now() - days * 86_400_000;
    const metrics: Array<[WebsiteChangeSignal["metric"], string]> = [
      ["sessions", "__sessions__"],
      ["product_views", "product_view"],
      ["add_to_carts", "add_to_cart"],
      ["checkouts", "begin_checkout"],
      ["purchases", "purchase"],
    ];

    const signals: WebsiteChangeSignal[] = metrics.map(([metric, eventName]) => {
      const recentSet = new Set<string>();
      const previousSet = new Set<string>();
      let recent = 0;
      let previous = 0;
      for (const row of rows) {
        const ts = row.occurredAt.getTime();
        const isRecent = ts >= split;
        if (eventName === "__sessions__") {
          (isRecent ? recentSet : previousSet).add(row.sessionId);
        } else if (row.eventName === eventName) {
          if (isRecent) recent += 1;
          else previous += 1;
        }
      }
      if (eventName === "__sessions__") {
        recent = recentSet.size;
        previous = previousSet.size;
      }
      const changePercent = previous === 0 ? (recent > 0 ? 100 : 0) : Number((((recent - previous) / previous) * 100).toFixed(2));
      const direction: WebsiteChangeSignal["direction"] = changePercent > 2 ? "up" : changePercent < -2 ? "down" : "flat";
      const magnitude = Math.abs(changePercent);
      const significance: WebsiteChangeSignal["significance"] = magnitude >= 30 ? "high" : magnitude >= 10 ? "medium" : "low";
      return { metric, recent, previous, changePercent, direction, significance };
    });

    return { windowDays: days, signals };
  }
}
