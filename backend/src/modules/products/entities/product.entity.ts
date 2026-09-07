import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CategoryEntity } from "@/modules/categories/entities/category.entity";
import { ProductVariantEntity } from "./product-variant.entity";

export type ProductStatus = "draft" | "active" | "archived";
export type ProductVisibility = "visible" | "hidden";

// Sprint 7 — Phase 9 §3 Product Content Standards template, transcribed
// as a type. Every field here maps 1:1 to a row in that section's table.
export interface ProductContent {
  shortDescription: string; // one sentence, finish + primary benefit, <20 words
  keyBenefits: string[]; // 3-5 scannable, concrete-outcome bullets
  features: string[]; // factual "what it is/does" bullets, distinct from benefits
  ingredients: string; // full, unabridged listing
  usageInstructions: string[]; // numbered, sequential steps
  warnings: string; // plain-language safety statement
  storageInstructions: string; // 1-2 sentences, concrete conditions
  specifications: Record<string, string>; // size, finish, shelf life, etc.
  faqs: { question: string; answer: string }[]; // 3-6 pairs
}

// Sprint 3.4/3.5 — Product entity, per Phase 8 §3/§4. "Owns all product
// data; Categories/Collections reference but don't duplicate it."
// Status and Visibility are separate fields per Phase 16 §16.4's note
// ("carries a Visibility flag independent of Status").
@Entity("products")
export class ProductEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  slug!: string;

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  // Sprint 7 — was missing entirely until now: ProductEntity had no
  // image field despite the frontend's mock Product type (Sprint 2)
  // always expecting one. Array (not a single imageUrl) since Phase 9
  // §6/§7's Digital Asset Strategy expects multiple images per product
  // (gallery), not one.
  @Column({ type: "jsonb", default: [] })
  mediaUrls!: string[];

  // Sprint 7 — Content Population: the full Phase 9 §3 product content
  // template (short description, key benefits, features, ingredients,
  // usage instructions, warnings, storage instructions, specifications,
  // product-level FAQs). Modeled as one jsonb column rather than 9
  // separate typed columns — a deliberate simplification (documented,
  // not silent): the template's shape is stable and always read/written
  // as a unit by the admin CMS/product editor, so normalizing it into
  // separate columns would add migration overhead without a query
  // pattern that needs it. Revisit if a future sprint needs to filter/
  // search on an individual sub-field (e.g. "products containing
  // ingredient X").
  @Column({ type: "jsonb", nullable: true })
  content?: ProductContent;

  // Sprint 7 — SEO Standards (Phase 2 §14). Kept as separate typed
  // columns (unlike `content` above) because these ARE queried/
  // validated independently — e.g. a future SEO audit job checking
  // every product has a metaTitle under the length limit.
  @Column({ nullable: true })
  metaTitle?: string;

  @Column({ type: "text", nullable: true })
  metaDescription?: string;

  @ManyToOne(() => CategoryEntity, { nullable: false })
  category!: CategoryEntity;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  salePrice?: string;

  @Column({ default: "USD" })
  currency!: string;

  // Structured, filterable attributes per Phase 2 §2 / Phase 7 §1 —
  // finish, shade family, benefit, occasion. Kept as jsonb in Sprint 3
  // (foundation stage); promoted to normalized filter tables if/when
  // Search Services (Phase 16 §16.10, out of Sprint 3 scope) needs it.
  @Column({ type: "jsonb", default: {} })
  attributes!: Record<string, unknown>;

  @Column({ type: "varchar", default: "draft" })
  status!: ProductStatus;

  @Column({ type: "varchar", default: "hidden" })
  visibility!: ProductVisibility;

  @OneToMany(() => ProductVariantEntity, (variant) => variant.product, { cascade: true })
  variants!: ProductVariantEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt?: Date; // Phase 8 §4 — soft-deleted (archived), never hard-deleted
}
