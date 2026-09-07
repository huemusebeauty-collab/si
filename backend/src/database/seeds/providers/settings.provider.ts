import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { SettingsService } from "@/admin/settings/settings.service";
import { EMAIL_TEMPLATES } from "@/integrations/email/templates/templates";

const SEED_SYSTEM_ADMIN_ID = "system-seed";
// Sprint 7.5 — same placeholder-preserving technique as Sprint 7.4's
// notification-template QA test: calling each EMAIL_TEMPLATES function
// with values that ARE the {{var}} placeholder syntax means the
// function's own string-replace leaves the placeholders intact in the
// output, giving us the raw template source to seed into
// NotificationTemplateEntity.
const PLACEHOLDER_VARS = {
  firstName: "{{firstName}}", orderId: "{{orderId}}", total: "{{total}}",
  resetLink: "{{resetLink}}", trackingNumber: "{{trackingNumber}}", amount: "{{amount}}",
};

// Sprint 7.4.5 execution order #1 — Settings has no dependencies and
// everything else (SEO defaults, currency display) implicitly assumes
// it exists, so it seeds first.
//
// Sprint 7.5 extension: now also seeds tax rates, shipping zones,
// feature flags, and notification templates (all new Settings-module
// concerns this sprint adds) alongside Sprint 7.4's original business-
// settings fields, extended with the payment/SEO/media defaults Sprint
// 7.5 adds to BusinessSettingsEntity. Extending this SAME provider
// (rather than adding a parallel one) keeps Settings seeding in one
// place, consistent with the "single source of truth" principle this
// sprint applies everywhere else.
@Injectable()
export class SettingsSeedProvider implements SeedProvider {
  readonly name = "settings";
  readonly dependsOn: string[] = [];

  constructor(private readonly settings: SettingsService) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    const fields = {
      storeName: "Hue Muse Beauty",
      supportEmail: "support@huemusebeauty.local",
      supportPhone: "+1-800-555-0142",
      businessAddress: "500 Congress Ave, Austin, TX 78701, US",
      socialLinks: { instagram: "https://instagram.com/huemusebeauty", tiktok: "https://tiktok.com/@huemusebeauty" },
      currency: "USD",
      currencyDisplayLocale: "en-US",
      // Sprint 7.5 additions:
      activePaymentProviderDisplay: "mock", // matches Sprint 5's PAYMENT_PROVIDER=mock default — see CONFIGURATION_COMPLETENESS.md
      acceptedCurrencies: ["USD"],
      defaultOgImageUrl: "/mock/og-default.jpg",
      metaTitleSuffix: "| Hue Muse Beauty",
      twitterHandle: "@huemusebeauty",
      defaultRobotsDirective: "index,follow",
      maxUploadSizeBytes: 8 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      minImageDimensionPx: 400,
    };

    if (dryRun) {
      outcomes.push({ naturalKey: "default", action: "created" });
      outcomes.push({ naturalKey: "tax-rates", action: "created" });
      outcomes.push({ naturalKey: "shipping-zones", action: "created" });
      outcomes.push({ naturalKey: "feature-flags", action: "created" });
      outcomes.push({ naturalKey: "notification-templates", action: "created" });
      return { providerName: this.name, outcomes, durationMs: Date.now() - start };
    }

    const before = await this.settings.getBusinessSettings();
    const saved = await this.settings.updateBusinessSettings(fields);
    outcomes.push({
      naturalKey: "default",
      action: before.storeName === saved.storeName && before.activePaymentProviderDisplay === saved.activePaymentProviderDisplay ? "skipped-unchanged" : "updated",
      entityId: saved.id,
    });

    // Sprint 7.5 — Tax rates: two representative US states with sales
    // tax, demonstrating the region-based configuration (Phase 6 §10).
    for (const tax of [{ region: "US-CA", rate: "0.0725" }, { region: "US-NY", rate: "0.08875" }]) {
      const { entity, wasCreated } = await this.settings.upsertTaxRate(tax);
      outcomes.push({ naturalKey: `tax:${tax.region}`, action: wasCreated ? "created" : "updated", entityId: entity.id });
    }

    // Sprint 7.5 — Shipping zones: Continental US (standard rates) +
    // Alaska & Hawaii (higher rate, longer estimate), a realistic
    // minimum pair rather than one all-covering zone.
    const zones = [
      { name: "Continental US", regions: ["US-CA", "US-NY", "US-TX", "US-WA", "US-IL", "US-CO", "US-FL", "US-MA", "US-AZ"], methods: [{ name: "Standard", rate: 6, estimatedDaysMin: 3, estimatedDaysMax: 5 }, { name: "Expedited", rate: 15, estimatedDaysMin: 1, estimatedDaysMax: 2 }] },
      { name: "Alaska & Hawaii", regions: ["US-AK", "US-HI"], methods: [{ name: "Standard", rate: 14, estimatedDaysMin: 5, estimatedDaysMax: 8 }] },
    ];
    for (const zone of zones) {
      const { entity, wasCreated } = await this.settings.upsertShippingZone(zone);
      outcomes.push({ naturalKey: `shipping:${zone.name}`, action: wasCreated ? "created" : "updated", entityId: entity.id });
    }

    // Sprint 7.5 — Feature flags: three real, meaningful flags (not
    // placeholder data) — see FEATURE_FLAGS.md for what each actually
    // gates.
    const flags = [
      { key: "coupons.enabled", enabled: true, description: "Allow coupon codes to be applied at checkout." },
      { key: "reviews.mediaUploadsEnabled", enabled: true, description: "Allow customers to attach a photo to a review." },
      { key: "search.enabled", enabled: false, description: "Site search — reserved for a not-yet-built feature; off by default." },
    ];
    for (const flag of flags) {
      const saved = await this.settings.setFeatureFlag(flag.key, flag.enabled, flag.description);
      outcomes.push({ naturalKey: `flag:${flag.key}`, action: "created", entityId: flag.key === saved.key ? flag.key : undefined });
    }

    // Sprint 7.5 — Notification templates: seeds the Sprint 5.4
    // hardcoded templates into the new DB-backed table as their
    // initial admin-editable versions (EmailService's fallback means
    // this step isn't strictly required for email to work, but it's
    // what makes the templates actually visible/editable in the admin
    // UI rather than only existing as code).
    for (const [key, fn] of Object.entries(EMAIL_TEMPLATES)) {
      const rendered = (fn as (v: typeof PLACEHOLDER_VARS) => { subject: string; html: string; text: string })(PLACEHOLDER_VARS);
      const saved = await this.settings.upsertNotificationTemplate({ templateKey: key, ...rendered }, SEED_SYSTEM_ADMIN_ID);
      outcomes.push({ naturalKey: `template:${key}`, action: "created", entityId: saved.templateKey });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(): Promise<void> {
    // Sprint 7.4.5 — Settings is a single always-present row (never
    // created fresh by this provider, only updated) — there's nothing
    // to delete on rollback for the business-settings row itself. Sub-
    // entities (tax rates, shipping zones, flags, templates) are also
    // left in place on rollback — same documented "updated entities
    // aren't restored" limitation as every other provider (see
    // SEED_ENGINE.md); deleting them would be more destructive than
    // leaving Settings-module config as-is.
  }
}
