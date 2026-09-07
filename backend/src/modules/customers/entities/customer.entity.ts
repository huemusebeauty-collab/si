import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AddressEntity } from "./address.entity";

// Sprint 3.4/3.5 — Customer domain entity, per Phase 8 §4. Credentials
// (email/passwordHash) are colocated here for schema simplicity, but
// ownership remains as Phase 8 §3 draws it: the Authentication module
// owns login/session/token *logic*, while this table — owned by the
// Customers module — is the source-of-truth data Authentication reads
// through CustomersService, never through a direct repository import
// (Phase 8 §3/§16.1 cross-module rule).
@Entity("customers")
export class CustomerEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: "jsonb", default: {} })
  preferences!: Record<string, unknown>;

  @OneToMany(() => AddressEntity, (address) => address.customer)
  addresses!: AddressEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
