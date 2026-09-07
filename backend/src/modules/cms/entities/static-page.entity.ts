import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

// Sprint 3.4/3.5 — CMS entities, per Phase 8 §3/§4. "Owns editorial
// content only; no product or transactional data."
@Entity("static_pages")
export class StaticPageEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  slug!: string;

  @Column()
  title!: string;

  @Column({ type: "text" })
  content!: string;

  // Sprint 7.4 — same gap class as Product/Category/Collection.
  @Column({ nullable: true })
  metaTitle?: string;

  @Column({ type: "text", nullable: true })
  metaDescription?: string;

  @Column({ nullable: true })
  lastEditedByAdminId?: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
