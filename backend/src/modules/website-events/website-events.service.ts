import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import { TrackWebsiteEventDto } from "./dto/track-website-event.dto";
import { WebsiteEventEntity } from "./entities/website-event.entity";

@Injectable()
export class WebsiteEventsService {
  constructor(
    @InjectRepository(WebsiteEventEntity)
    private readonly events: Repository<WebsiteEventEntity>,
  ) {}

  async track(dto: TrackWebsiteEventDto): Promise<{ accepted: true; eventId: string }> {
    const event = this.events.create({
      eventId: randomUUID(),
      eventName: dto.eventName,
      sessionId: dto.sessionId,
      anonymousId: dto.anonymousId,
      path: dto.path,
      referrer: dto.referrer,
      source: dto.source,
      medium: dto.medium,
      campaign: dto.campaign,
      productId: dto.productId,
      orderId: dto.orderId,
      metadata: dto.metadata ?? {},
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
    });

    await this.events.insert(event);
    return { accepted: true, eventId: event.eventId };
  }
}
