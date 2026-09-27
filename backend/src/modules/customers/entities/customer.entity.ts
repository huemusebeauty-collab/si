import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AddressEntity } from "./address.entity";

@Entity("customers")
export class CustomerEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;
  @Index({ unique: true }) @Column() email!: string;
  @Column() passwordHash!: string;
  @Column() firstName!: string;
  @Column() lastName!: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ name: "gstin", type: "varchar", length: 15, nullable: true }) gstin?: string;
  @Column({ type: "jsonb", default: {} }) preferences!: Record<string, unknown>;
  @OneToMany(() => AddressEntity, (address) => address.customer) addresses!: AddressEntity[];
  @CreateDateColumn({ type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updatedAt!: Date;
}
