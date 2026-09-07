import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrderLineItemEntity } from "./order-line-item.entity";
import { OrderStatusHistoryEntity } from "./order-status-history.entity";

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "payment_failed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

// Sprint 3.4/3.5 — Order entity, per Phase 8 §3/§4: "Owns order data
// once created; immutable link back to the products/prices at time of
// purchase." Status transitions are appended to history, never
// overwritten (Phase 8 §4 / Phase 16 §16.8).
@Entity("orders")
export class OrderEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  customerId!: string;

  @Column({ type: "varchar", default: "pending_payment" })
  status!: OrderStatus;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total!: string;

  @Column({ default: "USD" })
  currency!: string;

  @Column({ type: "jsonb" })
  shippingAddress!: Record<string, unknown>;

  @OneToMany(() => OrderLineItemEntity, (item) => item.order, { cascade: true })
  lineItems!: OrderLineItemEntity[];

  @OneToMany(() => OrderStatusHistoryEntity, (h) => h.order, { cascade: true })
  statusHistory!: OrderStatusHistoryEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
