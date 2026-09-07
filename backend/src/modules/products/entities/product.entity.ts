import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CategoryEntity } from "@/modules/categories/entities/category.entity";
import { ProductVariantEntity } from "./product-variant.entity";

export type ProductStatus = "draft" | "active" | "archived";
export type ProductVisibility = "visible" | "hidden";

export interface ProductContent {
  shortDescription: string;
  keyBenefits: string[];
  features: string[];
  ingredients: string;
  usageInstructions: string[];
  warnings: string;
  storageInstructions: string;
  specifications: Record<string, string>;
  faqs: { question: string; answer: string }[];
}

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

  @Column({ type: "jsonb", default: [] })
  mediaUrls!: string[];

  @Column({ type: "jsonb", nullable: true })
  content?: ProductContent;

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

  @Column({ default: "INR" })
  currency!: string;

  // GST classification is product-level; MRP is variant-level because
  // different shades/SKUs may legally carry different retail prices.
  @Column({ type: "varchar", length: 32, nullable: true })
  hsnCode?: string;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  gstRate?: string;

  // When true, MRP is treated as tax-inclusive for the consumer price
  // ceiling. GST is extracted from the discounted gross amount rather
  // than added on top of the MRP.
  @Column({ type: "boolean", default: true })
  taxInclusiveMrp!: boolean;

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
  archivedAt?: Date;
}
