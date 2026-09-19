import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("inventory_movements")
@Index(["variantId", "createdAt"])
export class InventoryMovementEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  variantId!: string;

  @Column({ type: "integer" })
  delta!: number;

  @Column({ type: "integer" })
  quantityBefore!: number;

  @Column({ type: "integer" })
  quantityAfter!: number;

  @Column({ type: "varchar", length: 40 })
  reason!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  referenceType?: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  referenceId?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
