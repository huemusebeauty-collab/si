import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "contact_leads" })
export class ContactLeadEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  full_name!: string;

  @Column({ type: "text" })
  email!: string;

  @Column({ type: "text" })
  phone!: string;

  @Column({ type: "text" })
  address!: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  created_at!: Date;
}
