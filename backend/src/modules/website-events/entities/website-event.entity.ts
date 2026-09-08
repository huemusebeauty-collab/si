import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

export const WEBSITE_EVENT_NAMES = [
  "page_view",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const;

export type WebsiteEventName = (typeof WEBSITE_EVENT_NAMES)[number];

@Entity("website_events")
@Index("idx_website_events_event_name_occurred_at", ["eventName", "occurredAt"])
@Index("idx_website_events_session_occurred_at", ["sessionId", "occurredAt"])
export class WebsiteEventEntity {
  @PrimaryColumn({ type: "uuid" })
  eventId!: string;

  @Column({ type: "text" })
  eventName!: WebsiteEventName;

  @Column({ type: "text" })
  sessionId!: string;

  @Column({ type: "text", nullable: true })
  anonymousId?: string;

  @Column({ type: "text" })
  path!: string;

  @Column({ type: "text", nullable: true })
  referrer?: string;

  @Column({ type: "text", nullable: true })
  source?: string;

  @Column({ type: "text", nullable: true })
  medium?: string;

  @Column({ type: "text", nullable: true })
  campaign?: string;

  @Column({ type: "text", nullable: true })
  productId?: string;

  @Column({ type: "text", nullable: true })
  orderId?: string;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @Column({ type: "timestamptz" })
  occurredAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  receivedAt!: Date;
}
