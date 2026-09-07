import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// Sprint 6 §15 — Audit & Activity Logs. Phase 6 §15: "basic
// accountability logging, not a compliance or forensic audit system" —
// read-only once written, covering Product Changes, Order Updates,
// Login Activity, and Content Changes per the frozen scope. Modeled as
// one generic table (module + action + actor + before/after) rather
// than four separate tables, since the shape is identical across all
// four categories — kept simple per the "basic accountability" framing.
@Entity("audit_logs")
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  actorId!: string; // admin user ID, or "system" for automated actions

  @Column()
  actorEmail!: string;

  @Index()
  @Column()
  module!: string; // "products" | "orders" | "content" | "auth" | ...

  @Column()
  action!: string; // "create" | "update" | "delete" | "status_change" | "login_success" | "login_failure" | ...

  @Index()
  @Column({ nullable: true })
  entityId?: string; // the product/order/page ID affected, if applicable

  @Column({ type: "jsonb", nullable: true })
  before?: unknown;

  @Column({ type: "jsonb", nullable: true })
  after?: unknown;

  @CreateDateColumn({ type: "timestamptz" })
  @Index()
  createdAt!: Date;
}
