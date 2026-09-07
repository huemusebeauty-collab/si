import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("faq_entries")
export class FaqEntryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  category?: string;

  @Column()
  question!: string;

  @Column({ type: "text" })
  answer!: string;

  @Column({ nullable: true })
  lastEditedByAdminId?: string;
}
