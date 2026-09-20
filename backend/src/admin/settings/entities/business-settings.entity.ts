import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("business_settings")
export class BusinessSettingsEntity {
  @PrimaryColumn({ default: "default" })
  id!: string;

  @Column()
  storeName!: string;

  @Column()
  supportEmail!: string;

  @Column({ nullable: true })
  supportPhone?: string;

  @Column({ type: "text", nullable: true })
  businessAddress?: string;

  @Column({ nullable: true })
  legalEntityName?: string;

  @Column({ type: "boolean", default: false })
  gstRegistered!: boolean;

  @Column({ type: "varchar", length: 15, nullable: true })
  gstin?: string;

  @Column({ type: "text", nullable: true })
  registeredAddress?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  registeredState?: string;

  @Column({ type: "varchar", length: 2, nullable: true })
  registeredStateCode?: string;

  @Column({ type: "boolean", default: false })
  reverseChargeDefault!: boolean;

  @Column({ type: "jsonb", default: {} })
  socialLinks!: Record<string, string>;

  @Column({ default: "USD" })
  currency!: string;

  @Column({ default: "en-US" })
  currencyDisplayLocale!: string;

  @Column({ default: "mock" })
  activePaymentProviderDisplay!: string;

  @Column({ type: "jsonb", default: ["USD"] })
  acceptedCurrencies!: string[];

  @Column({ nullable: true })
  defaultOgImageUrl?: string;

  @Column({ nullable: true })
  metaTitleSuffix?: string;

  @Column({ nullable: true })
  twitterHandle?: string;

  @Column({ default: "index,follow" })
  defaultRobotsDirective!: string;

  @Column({ default: 8 * 1024 * 1024 })
  maxUploadSizeBytes!: number;

  @Column({ type: "jsonb", default: ["image/jpeg", "image/png", "image/webp"] })
  allowedMimeTypes!: string[];

  @Column({ default: 400 })
  minImageDimensionPx!: number;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
