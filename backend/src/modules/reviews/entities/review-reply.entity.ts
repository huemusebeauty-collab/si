import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ReviewEntity } from "./review.entity";

@Entity("review_replies")
export class ReviewReplyEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ReviewEntity, (review) => review.replies, { onDelete: "CASCADE" })
  review!: ReviewEntity;

  @Column()
  adminId!: string;

  @Column({ type: "text" })
  text!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
