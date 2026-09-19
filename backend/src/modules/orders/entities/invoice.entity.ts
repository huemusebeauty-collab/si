import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("invoices")
export class InvoiceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  orderId!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 16 })
  invoiceNumber!: string;

  @Column({ type: "varchar", length: 9 })
  financialYear!: string;

  @Column({ type: "timestamptz" })
  issuedAt!: Date;

  @Column({ type: "jsonb" })
  snapshot!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
