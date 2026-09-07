import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent } from "typeorm";

// Sprint 3.4/3.5 — Category entity, per Phase 8 §3/§4. "Owns taxonomy
// only; does not own product content." Self-referencing tree supports
// Phase 1 §4's Category/Subcategory structure without a separate join
// table.
@Entity("categories")
@Tree("closure-table")
export class CategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  slug!: string;

  @Column()
  name!: string;

  @TreeParent()
  parent?: CategoryEntity;

  @TreeChildren()
  children!: CategoryEntity[];

  // Sprint 4.3 — Category & Collection: visibility rules + display
  // ordering, layered onto Sprint 3's tree structure.
  @Column({ default: true })
  visible!: boolean;

  @Column({ default: 0 })
  displayOrder!: number;

  // Sprint 7.4 — was missing entirely; the Sprint 7.3 Content
  // Validation Engine's category validator checks SEO metadata, but
  // CategoryEntity had nowhere to store it until now (same gap class
  // as Product's missing `mediaUrls`, found the same way — by trying
  // to actually seed and validate real data).
  @Column({ nullable: true })
  metaTitle?: string;

  @Column({ type: "text", nullable: true })
  metaDescription?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
