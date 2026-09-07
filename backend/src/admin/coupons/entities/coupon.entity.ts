import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type DiscountType = "percentage" | "fixed_amount";

// Sprint 6 — Coupons entity. Phase 8 §3 named a Coupons module in the
// original architecture; it was never scaffolded in Sprint 3 (not in
// Sprint 3.5's module list) and Sprint 4's CartService.applyCoupon
// stored a code without computing a discount. This sprint's "Promotion
// Management" deliverable is the first real need for it — built here,
// minimal (Phase 6 §8's scope: code, discount type/value, active
// window, redemption tracking — no stacking rules, no per-customer
// eligibility targeting).
@Entity("coupons")
export class CouponEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  code!: string;

  @Column({ type: "varchar" })
  discountType!: DiscountType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  discountValue!: string;

  @Column({ type: "timestamptz" })
  startAt!: Date;

  @Column({ type: "timestamptz" })
  endAt!: Date;

  @Column({ default: true })
  active!: boolean;

  @Column({ nullable: true })
  usageLimit?: number;

  @Column({ default: 0 })
  timesRedeemed!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
