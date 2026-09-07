import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { WishlistItemEntity } from "./wishlist-item.entity";

@Entity("wishlists")
export class WishlistEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ nullable: true })
  customerId?: string;

  @Index()
  @Column({ nullable: true })
  sessionId?: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  shareToken?: string;

  @OneToMany(() => WishlistItemEntity, (item) => item.wishlist, { cascade: true })
  items!: WishlistItemEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
