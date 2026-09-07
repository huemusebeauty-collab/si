import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

// Sprint 5.2 — Idempotency handling. A client-supplied (or server-
// generated, per-order) key is stored with the first response it
// produced; a repeated request with the same key returns the stored
// response instead of re-initiating a second real payment attempt —
// critical for payment endpoints specifically, where a network retry
// on the client side must never double-charge.
@Entity("idempotency_keys")
export class IdempotencyKeyEntity {
  @PrimaryColumn()
  key!: string;

  @Index()
  @Column()
  scope!: string; // e.g. "payment:initiate" — same key could theoretically be reused across different operation types

  @Column({ type: "jsonb" })
  responseBody!: unknown;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
