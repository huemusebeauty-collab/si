import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CartEntity } from "./cart.entity";

@Entity("cart_line_items")
export class CartLineItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => CartEntity, (cart) => cart.lineItems, { onDelete: "CASCADE" })
  cart!: CartEntity;

  @Column()
  variantId!: string; // references ProductVariantEntity.id by ID only, per Phase 8 §4 ownership rule

  @Column()
  quantity!: number;

  @Column({ default: false })
  savedForLater!: boolean;
}
