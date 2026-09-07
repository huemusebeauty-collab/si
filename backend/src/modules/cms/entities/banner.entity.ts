import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("banners")
export class BannerEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  placement!: string; // e.g. "homepage-hero", "category-top"

  @Column()
  imageUrl!: string;

  // Sprint 7.4 — was missing; the Sprint 7.3 banner validator requires it.
  @Column({ nullable: true })
  imageAltText?: string;

  @Column({ nullable: true })
  headline?: string;

  @Column({ nullable: true })
  ctaUrl?: string;

  @Column({ type: "timestamptz" })
  startAt!: Date;

  @Column({ type: "timestamptz" })
  endAt!: Date;
}
