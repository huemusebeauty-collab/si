import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, VersionColumn } from "typeorm";
import { ProductEntity } from "./product.entity";

export type StockState = "in-stock" | "low-stock" | "out-of-stock" | "coming-soon" | "pre-order";

// Sprint 3.4/3.5 — Variant/SKU entity (simplified: one table covers both
// Phase 8 §4's "Variant" and "SKU" concepts for Sprint 3's foundation
// stage — e.g. a shade). "A Product has many Variants, each resolving
// to exactly one SKU" (Phase 8 §4) — modeled 1:1 here rather than as two
// separate tables, a documented simplification to revisit if a future
// sprint needs variant/SKU to diverge (e.g. one variant sold under
// multiple SKUs for different pack sizes).
@Entity("product_variants")
export class ProductVariantEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ProductEntity, (product) => product.variants, { onDelete: "CASCADE" })
  product!: ProductEntity;

  @Index({ unique: true })
  @Column()
  sku!: string;

  @Column()
  name!: string; // e.g. shade name

  @Column({ nullable: true })
  hexColor?: string;

  @Column({ type: "varchar", default: "in-stock" })
  stockState!: StockState;

  @Column({ default: 0 })
  stockQuantity!: number;

  // Sprint 4.9 — Transactions: optimistic locking. Two concurrent
  // requests decrementing stock (e.g. two customers checking out the
  // last unit) will race on `version` — TypeORM raises
  // OptimisticLockVersionMismatchError on the loser, which
  // ProductsService.decrementStock (below) translates into a
  // DomainException(STALE_WRITE_CONFLICT) rather than silently
  // overwriting the other request's write.
  @VersionColumn()
  version!: number;
}
