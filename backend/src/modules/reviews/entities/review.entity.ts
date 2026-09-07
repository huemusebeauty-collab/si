import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ReviewReplyEntity } from "./review-reply.entity";

export type ReviewStatus = "pending" | "approved" | "hidden";

// Sprint 3.4/3.5 — Review entity, per Phase 8 §3/§4. "Owns review
// content; references Products and Customers by ID." New reviews
// default to pending (Phase 16 §16.9).
@Entity("reviews")
export class ReviewEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  customerId!: string;

  @Index()
  @Column()
  variantId!: string; // "skuId" per Phase 16 §16.9 signature

  @Column({ type: "smallint" })
  rating!: number;

  @Column({ type: "text" })
  text!: string;

  @Column({ nullable: true })
  mediaUrl?: string;

  @Column({ default: false })
  verifiedPurchase!: boolean;

  @Column({ type: "varchar", default: "pending" })
  status!: ReviewStatus;

  @OneToMany(() => ReviewReplyEntity, (reply) => reply.review, { cascade: true })
  replies!: ReviewReplyEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
