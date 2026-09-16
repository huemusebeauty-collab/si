import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { PaymentStatus } from "../payment-provider.interface";

@Entity("payment_transactions")
export class PaymentTransactionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  orderId!: string;

  @Column()
  provider!: string;

  @Index({ unique: true })
  @Column()
  providerReference!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ default: "INR" })
  currency!: string;

  @Column({ type: "varchar" })
  status!: PaymentStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
