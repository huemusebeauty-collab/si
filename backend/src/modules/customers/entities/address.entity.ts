import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CustomerEntity } from "./customer.entity";

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

  @Column({ type: "varchar", length: 2, nullable: true })
  stateCode?: string;

  @Column()
  postalCode!: string;

  @Column()
  country!: string;

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
