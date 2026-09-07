import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, VersionColumn } from "typeorm";
import { ProductEntity } from "./product.entity";

export type StockState = "in-stock" | "low-stock" | "out-of-stock" | "coming-soon" | "pre-order";

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
  name!: string;

  @Column({ nullable: true })
  hexColor?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  mrp?: string;

  @Column({ type: "varchar", default: "in-stock" })
  stockState!: StockState;

  @Column({ default: 0 })
  stockQuantity!: number;

  @VersionColumn()
  version!: number;
}
