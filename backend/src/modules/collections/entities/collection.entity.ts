import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { ProductEntity } from "@/modules/products/entities/product.entity";

// Sprint 3.4/3.5 — Collection entity, per Phase 8 §3/§4: "References
// Products by ID; owns no product content itself." Products <-> many-to-many
// per Phase 8 §4 Relationships.
@Entity("collections")
export class CollectionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  slug!: string;

  @Column()
  name!: string;

  @Column()
  tagline!: string;

  @Column({ default: true })
  active!: boolean;

  // Sprint 4.3 — featured collections + display ordering.
  @Column({ default: false })
  featured!: boolean;

  @Column({ default: 0 })
  displayOrder!: number;

  // Sprint 7.4 — was missing; same gap class as Category/Product's
  // missing SEO fields, found by trying to actually seed+validate real
  // collection data against the Sprint 7.3 validator.
  @Column({ nullable: true })
  metaTitle?: string;

  @Column({ type: "text", nullable: true })
  metaDescription?: string;

  // Sprint 7.4 — "Active dates" (Sprint 7.4's own Collection deliverable
  // list). Optional: most collections (Best Sellers, New Arrivals) are
  // evergreen with no window; only seasonal/limited-edition ones set these.
  @Column({ type: "timestamptz", nullable: true })
  startAt?: Date;

  @Column({ type: "timestamptz", nullable: true })
  endAt?: Date;

  @ManyToMany(() => ProductEntity)
  @JoinTable({ name: "collection_products" })
  products!: ProductEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
