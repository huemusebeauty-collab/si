import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CartLineItemEntity } from "./cart-line-item.entity";

// Sprint 3.4/3.5 — Cart entity, per Phase 8 §3/§4. "Owns session/cart
// state only; reads product/price data, does not own it." Supports
// both guest (sessionId) and authenticated (customerId) carts per
// Phase 8 §6's guest-to-registered upgrade path.
@Entity("carts")
export class CartEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ nullable: true })
  customerId?: string;

  @Index()
  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  couponCode?: string;

  // Sprint 6 — stores the computed discount amount alongside the code,
  // so getTotals doesn't need to re-validate/re-fetch the coupon on
  // every read (only applyCoupon recomputes it).
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  discountAmount?: string;

  @OneToMany(() => CartLineItemEntity, (item) => item.cart, { cascade: true })
  lineItems!: CartLineItemEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
