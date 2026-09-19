import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { ShipmentStatus } from "./shipment.entity";

@Entity("shipment_events")
export class ShipmentEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  shipmentId!: string;

  @Column({ type: "varchar" })
  status!: ShipmentStatus;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  location?: string;

  @Index()
  @Column({ type: "timestamptz" })
  eventAt!: Date;

  @Column({ type: "varchar", length: 160, nullable: true })
  externalEventId?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
