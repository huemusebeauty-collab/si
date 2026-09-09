import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebsiteEventEntity } from "./entities/website-event.entity";

export type CustomerJourneyStep = "page_view" | "product_view" | "add_to_cart" | "begin_checkout" | "purchase";

export type CustomerJourneySummary = {
  windowDays: number;
  from: string;
  to: string;
  sessions: number;
  completedPurchases: number;
  avgJourneyMinutes: number;
  stageDropoff: Array<{ from: CustomerJourneyStep; to: CustomerJourneyStep; sessions: number; conversionRate: number }>;
  topJourneys: Array<{ path: CustomerJourneyStep[]; sessions: number }>;
};

const STEPS: CustomerJourneyStep[] = ["page_view", "product_view", "add_to_cart", "begin_checkout", "purchase"];

@Injectable()
export class CustomerJourneyService {
  constructor(
    @InjectRepository(WebsiteEventEntity)
    private readonly events: Repository<WebsiteEventEntity>,
  ) {}

  async getJourney(windowDays = 30): Promise<CustomerJourneySummary> {
    const safeDays = Math.min(Math.max(Math.floor(windowDays) || 30, 1), 90);
    const rows = await this.events
      .createQueryBuilder("event")
      .select(["event.sessionId", "event.eventName", "event.occurredAt"])
      .where("event.occurredAt >= NOW() - (:days * INTERVAL '1 day')", { days: safeDays })
      .andWhere("event.eventName IN (:...steps)", { steps: STEPS })
      .orderBy("event.sessionId", "ASC")
      .addOrderBy("event.occurredAt", "ASC")
      .getMany();

    const sessions = new Map<string, { seen: Set<CustomerJourneyStep>; path: CustomerJourneyStep[]; first?: Date; last?: Date }>();
    for (const event of rows) {
      const step = event.eventName as CustomerJourneyStep;
      const state = sessions.get(event.sessionId) ?? { seen: new Set<CustomerJourneyStep>(), path: [] };
      if (!state.first) state.first = event.occurredAt;
      state.last = event.occurredAt;
      if (!state.seen.has(step)) {
        state.seen.add(step);
        state.path.push(step);
      }
      sessions.set(event.sessionId, state);
    }

    const stageDropoff = STEPS.slice(0, -1).map((from, index) => {
      const to = STEPS[index + 1];
      const fromSessions = [...sessions.values()].filter((s) => s.seen.has(from)).length;
      const toSessions = [...sessions.values()].filter((s) => s.seen.has(to)).length;
      return {
        from,
        to,
        sessions: Math.max(fromSessions - toSessions, 0),
        conversionRate: fromSessions ? Number(((toSessions / fromSessions) * 100).toFixed(2)) : 0,
      };
    });

    const journeyCounts = new Map<string, { path: CustomerJourneyStep[]; sessions: number }>();
    for (const state of sessions.values()) {
      if (!state.path.length) continue;
      const key = state.path.join(">");
      const current = journeyCounts.get(key) ?? { path: state.path, sessions: 0 };
      current.sessions += 1;
      journeyCounts.set(key, current);
    }

    const durations = [...sessions.values()]
      .filter((s) => s.first && s.last)
      .map((s) => (s.last!.getTime() - s.first!.getTime()) / 60000);

    return {
      windowDays: safeDays,
      from: new Date(Date.now() - safeDays * 86_400_000).toISOString(),
      to: new Date().toISOString(),
      sessions: sessions.size,
      completedPurchases: [...sessions.values()].filter((s) => s.seen.has("purchase")).length,
      avgJourneyMinutes: durations.length ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)) : 0,
      stageDropoff,
      topJourneys: [...journeyCounts.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 10),
    };
  }
}
