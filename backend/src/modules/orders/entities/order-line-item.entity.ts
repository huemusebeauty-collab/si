import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OrderEntity } from "./order.entity";

// Sprint 3.4 — immutable snapshot of variant/price at time of purchase
// (Phase 8 §4), decoupled from any later product/price change — hence
// productName/unitPrice are copied here rather than joined live.
@Entity("order_line_items")
export class OrderLineItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => OrderEntity, (order) => order.lineItems, { onDelete: "CASCADE" })
  order!: OrderEntity;

  @Column()
  variantId!: string;

  @Column()
  productName!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice!: string;

  @Column()
  quantity!: number;
}
