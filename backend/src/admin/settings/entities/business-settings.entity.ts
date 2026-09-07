import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

// Sprint 7 — Website Settings (Phase 6 §10). Single-row table (a
// documented pattern for "global config," not a design oversight —
// `id` is always the literal string "default"). Branding itself is
// explicitly "read-only reference to Phase 4 tokens, not a theme
// editor" per Phase 6 §10, so no logo/color columns exist here — only
// the fields Phase 6 §10 actually names as admin-editable.
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

  @Column({ type: "jsonb", default: {} })
  socialLinks!: Record<string, string>; // e.g. { instagram: "...", tiktok: "..." }

  @Column({ default: "USD" })
  currency!: string;

  @Column({ default: "en-US" })
  currencyDisplayLocale!: string; // drives Intl.NumberFormat formatting, per Phase 6 §10's "display format"

  // Sprint 7.5 — Payment defaults. Reference/display fields — the
  // actual DI-level provider selection in PaymentModule remains
  // env-var-driven (`PAYMENT_PROVIDER`), not dynamically switchable at
  // runtime from this row. See CONFIGURATION_COMPLETENESS.md for why:
  // hot-swapping a payment provider is not something that should be a
  // casual runtime toggle even if it were technically wired up, and
  // NestJS DI providers are resolved once at boot, not re-resolved per
  // request. These fields exist so the ACTIVE provider/currencies are
  // discoverable and auditable through the Settings module (matching
  // what's really configured in .env) rather than requiring someone to
  // go read server environment variables to know the answer.
  @Column({ default: "mock" })
  activePaymentProviderDisplay!: string;

  @Column({ type: "jsonb", default: ["USD"] })
  acceptedCurrencies!: string[];

  // Sprint 7.5 — SEO defaults / Open Graph metadata (site-level
  // fallbacks; per-entity metaTitle/metaDescription from Sprint 7.3/7.4
  // always take precedence when set — these are what's used when they
  // AREN'T).
  @Column({ nullable: true })
  defaultOgImageUrl?: string;

  @Column({ nullable: true })
  metaTitleSuffix?: string; // appended to every page's title, e.g. "| Hue Muse Beauty"

  @Column({ nullable: true })
  twitterHandle?: string;

  @Column({ default: "index,follow" })
  defaultRobotsDirective!: string;

  // Sprint 7.5 — Media settings. Previously hardcoded as a constant
  // inside StorageService and separately re-cited inside the Sprint 7.3
  // media validator (documented at the time as "can't drift silently
  // without both being visibly wrong" — now genuinely a single source
  // of truth instead of two constants that happened to agree).
  @Column({ default: 8 * 1024 * 1024 })
  maxUploadSizeBytes!: number;

  @Column({ type: "jsonb", default: ["image/jpeg", "image/png", "image/webp"] })
  allowedMimeTypes!: string[];

  @Column({ default: 400 })
  minImageDimensionPx!: number;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
