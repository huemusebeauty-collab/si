import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type WebhookProcessingStatus = "received" | "processed" | "failed" | "duplicate";

// Sprint 5.7 — Webhook Framework: Audit logging + Replay protection.
// Every inbound webhook is recorded here BEFORE processing — the
// (provider, providerEventId) pair is unique, so a second delivery of
// the same event (all major providers redeliver on a missed 2xx) is
// detected and short-circuited rather than double-processed (e.g.
// double-confirming an order from two payment webhook deliveries).
@Entity("webhook_events")
@Index(["provider", "providerEventId"], { unique: true })
export class WebhookEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  provider!: string; // "payment:mock", "payment:stripe", "shipping:mock", ...

  @Column()
  providerEventId!: string; // provider's own event/delivery ID — the replay-protection key

  @Column({ type: "text" })
  rawBody!: string;

  @Column({ type: "varchar", default: "received" })
  status!: WebhookProcessingStatus;

  @Column({ type: "text", nullable: true })
  processingError?: string;

  @Column({ default: 0 })
  attemptCount!: number;

  @CreateDateColumn({ type: "timestamptz" })
  receivedAt!: Date;
}
