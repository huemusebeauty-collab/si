import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { WishlistEntity } from "./wishlist.entity";

@Entity("wishlist_items")
export class WishlistItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => WishlistEntity, (wishlist) => wishlist.items, { onDelete: "CASCADE" })
  wishlist!: WishlistEntity;

  @Column()
  variantId!: string;
}
