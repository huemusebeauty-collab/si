import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OrderEntity } from "./order.entity";

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

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  mrp?: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  hsnCode?: string;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  gstRate?: string;

  @Column({ type: "boolean", default: true })
  taxInclusiveMrp!: boolean;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  taxableAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  taxAmount!: string;

  @Column()
  quantity!: number;
}
