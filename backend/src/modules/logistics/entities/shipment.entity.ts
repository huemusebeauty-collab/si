import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type ShipmentStatus =
  | "draft"
  | "ready_to_ship"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "rto"
  | "return_requested"
  | "return_in_transit"
  | "returned"
  | "cancelled";

@Entity("shipments")
export class ShipmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  orderId!: string;

  @Column({ type: "varchar", default: "draft" })
  status!: ShipmentStatus;

  @Column({ type: "varchar", length: 80, nullable: true })
  carrier?: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  serviceLevel?: string;

  @Index()
  @Column({ type: "varchar", length: 120, nullable: true })
  awbNumber?: string;

  @Column({ type: "text", nullable: true })
  trackingUrl?: string;

  @Column({ type: "integer", nullable: true })
  weightGrams?: number;

  @Column({ type: "numeric", precision: 8, scale: 2, nullable: true })
  lengthCm?: string;

  @Column({ type: "numeric", precision: 8, scale: 2, nullable: true })
  widthCm?: string;

  @Column({ type: "numeric", precision: 8, scale: 2, nullable: true })
  heightCm?: string;

  @Column({ type: "jsonb" })
  shippingAddress!: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  labelUrl?: string;

  @Column({ type: "timestamptz", nullable: true })
  estimatedDeliveryAt?: Date;

  @Column({ type: "timestamptz", nullable: true })
  shippedAt?: Date;

  @Column({ type: "timestamptz", nullable: true })
  deliveredAt?: Date;

  @Column({ type: "text", nullable: true })
  failureReason?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
