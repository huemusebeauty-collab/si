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
  @PrimaryColumn({ name: "event_id", type: "uuid" })
  eventId!: string;

  @Column({ name: "event_name", type: "text" })
  eventName!: WebsiteEventName;

  @Column({ name: "session_id", type: "text" })
  sessionId!: string;

  @Column({ name: "anonymous_id", type: "text", nullable: true })
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

  @Column({ name: "product_id", type: "text", nullable: true })
  productId?: string;

  @Column({ name: "order_id", type: "text", nullable: true })
  orderId?: string;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @Column({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;

  @CreateDateColumn({ name: "received_at", type: "timestamptz" })
  receivedAt!: Date;
}
