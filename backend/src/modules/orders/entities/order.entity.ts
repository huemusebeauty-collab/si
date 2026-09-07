import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrderLineItemEntity } from "./order-line-item.entity";
import { OrderStatusHistoryEntity } from "./order-status-history.entity";

export type OrderStatus = "pending_payment" | "confirmed" | "payment_failed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";

@Entity("orders")
export class OrderEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  customerId!: string;

  @Column({ type: "varchar", default: "pending_payment" })
  status!: OrderStatus;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  subtotal!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  taxableAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  taxAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total!: string;

  @Column({ default: "INR" })
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
