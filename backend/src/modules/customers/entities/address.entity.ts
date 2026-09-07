import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CustomerEntity } from "./customer.entity";

// Sprint 3.4/3.5 — Address entity, per Phase 8 §4 (Customer domain).
@Entity("addresses")
export class AddressEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => CustomerEntity, (customer) => customer.addresses, { onDelete: "CASCADE" })
  customer!: CustomerEntity;

  @Column()
  line1!: string;

  @Column({ nullable: true })
  line2?: string;

  @Column()
  city!: string;

  @Column()
  region!: string;

  @Column()
  postalCode!: string;

  @Column()
  country!: string;

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
