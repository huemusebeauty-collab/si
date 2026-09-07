import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BusinessSettingsEntity } from "./entities/business-settings.entity";
import { TaxRateEntity } from "./entities/tax-rate.entity";
import { ShippingZoneEntity } from "./entities/shipping-zone.entity";
import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import { NotificationTemplateEntity } from "./entities/notification-template.entity";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";

// Sprint 7 — SettingsService, per Phase 6 §10.
// Sprint 7.5 — extended with feature flags, notification templates,
// and real natural-key upserts for tax rates / shipping zones (the
// originals, despite being named "upsert," only ever updated a row the
// caller already had the UUID for — the same "named upsert, actually
// always-insert-or-only-ID-based" gap class Sprint 7.4 found and fixed
// in CmsService; found here the same way, by using the method for real).
@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(BusinessSettingsEntity) private readonly business: Repository<BusinessSettingsEntity>,
    @InjectRepository(TaxRateEntity) private readonly taxRates: Repository<TaxRateEntity>,
    @InjectRepository(ShippingZoneEntity) private readonly shippingZones: Repository<ShippingZoneEntity>,
    @InjectRepository(FeatureFlagEntity) private readonly featureFlags: Repository<FeatureFlagEntity>,
    @InjectRepository(NotificationTemplateEntity) private readonly notificationTemplates: Repository<NotificationTemplateEntity>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async getBusinessSettings(): Promise<BusinessSettingsEntity> {
    const existing = await this.business.findOne({ where: { id: "default" } });
    if (existing) return existing;
    // Sprint 7 — sensible defaults if settings were never explicitly
    // saved, so every other read path never has to null-check this.
    return this.business.save(
      this.business.create({ id: "default", storeName: "Hue Muse Beauty", supportEmail: "support@huemusebeauty.local", currency: "USD" }),
    );
  }

  async updateBusinessSettings(fields: Partial<BusinessSettingsEntity>): Promise<BusinessSettingsEntity> {
    const current = await this.getBusinessSettings();
    Object.assign(current, fields);
    const saved = await this.business.save(current);
    await this.cacheInvalidation.invalidatePrefix("settings");
    return saved;
  }

  async listTaxRates(): Promise<TaxRateEntity[]> {
    return this.taxRates.find({ where: { active: true } });
  }

  // Sprint 7.5 correction: upserts by `region` (the real natural key
  // for a tax rate — one active rate per region) instead of requiring
  // the caller to already know a row's UUID.
  async upsertTaxRate(data: { region: string; rate: string }): Promise<{ entity: TaxRateEntity; wasCreated: boolean }> {
    const existing = await this.taxRates.findOne({ where: { region: data.region } });
    const entity = existing ?? this.taxRates.create({ region: data.region, active: true });
    entity.rate = data.rate;
    const saved = await this.taxRates.save(entity);
    await this.cacheInvalidation.invalidatePrefix("settings");
    return { entity: saved, wasCreated: !existing };
  }

  async listShippingZones(): Promise<ShippingZoneEntity[]> {
    return this.shippingZones.find({ where: { active: true } });
  }

  // Sprint 7.5 correction: upserts by `name` (same reasoning as tax rates).
  async upsertShippingZone(data: {
    name: string;
    regions: string[];
    methods: { name: string; rate: number; estimatedDaysMin: number; estimatedDaysMax: number }[];
  }): Promise<{ entity: ShippingZoneEntity; wasCreated: boolean }> {
    const existing = await this.shippingZones.findOne({ where: { name: data.name } });
    const entity = existing ?? this.shippingZones.create({ name: data.name, active: true });
    entity.regions = data.regions;
    entity.methods = data.methods;
    const saved = await this.shippingZones.save(entity);
    await this.cacheInvalidation.invalidatePrefix("settings");
    return { entity: saved, wasCreated: !existing };
  }

  // Sprint 7.5 — Feature Flags. `isFeatureEnabled` defaults to `true`
  // for an unregistered key (a flag that's never been explicitly
  // turned off shouldn't silently disable a feature) — the same
  // "absence means the permissive default" principle used elsewhere in
  // this codebase (e.g. a robots directive defaulting to indexable).
  async listFeatureFlags(): Promise<FeatureFlagEntity[]> {
    return this.featureFlags.find();
  }

  async isFeatureEnabled(key: string): Promise<boolean> {
    const flag = await this.featureFlags.findOne({ where: { key } });
    return flag?.enabled ?? true;
  }

  async setFeatureFlag(key: string, enabled: boolean, description?: string): Promise<FeatureFlagEntity> {
    const existing = await this.featureFlags.findOne({ where: { key } });
    const entity = existing ?? this.featureFlags.create({ key });
    entity.enabled = enabled;
    if (description !== undefined) entity.description = description;
    const saved = await this.featureFlags.save(entity);
    await this.cacheInvalidation.invalidatePrefix("settings");
    return saved;
  }

  // Sprint 7.5 — Notification Templates. Returns `null` (not a thrown
  // NotFoundException) when no DB override exists — EmailService's
  // fallback logic depends on being able to distinguish "no override,
  // use the hardcoded template" from a real error.
  async getNotificationTemplateOverride(templateKey: string): Promise<NotificationTemplateEntity | null> {
    return this.notificationTemplates.findOne({ where: { templateKey } });
  }

  async listNotificationTemplateOverrides(): Promise<NotificationTemplateEntity[]> {
    return this.notificationTemplates.find();
  }

  async upsertNotificationTemplate(data: { templateKey: string; subject: string; html: string; text: string }, adminId: string): Promise<NotificationTemplateEntity> {
    const existing = await this.notificationTemplates.findOne({ where: { templateKey: data.templateKey } });
    const entity = existing ?? this.notificationTemplates.create({ templateKey: data.templateKey });
    entity.subject = data.subject;
    entity.html = data.html;
    entity.text = data.text;
    entity.lastEditedByAdminId = adminId;
    const saved = await this.notificationTemplates.save(entity);
    await this.cacheInvalidation.invalidatePrefix("settings");
    return saved;
  }

  // Sprint 7.5 — Media Settings, consumed by StorageService and the
  // Sprint 7.3 media validator so the upload size/type/dimension limits
  // are genuinely sourced from Settings, not a hardcoded constant
  // duplicated in two places.
  async getMediaSettings(): Promise<{ maxUploadSizeBytes: number; allowedMimeTypes: string[]; minImageDimensionPx: number }> {
    const settings = await this.getBusinessSettings();
    return {
      maxUploadSizeBytes: settings.maxUploadSizeBytes,
      allowedMimeTypes: settings.allowedMimeTypes,
      minImageDimensionPx: settings.minImageDimensionPx,
    };
  }

  // Sprint 7.5 — SEO Defaults, for whatever entity's own metaTitle/
  // metaDescription is unset (Sprint 7.3's per-entity SEO always wins
  // when present).
  async getSeoDefaults(): Promise<{ defaultOgImageUrl?: string; metaTitleSuffix?: string; twitterHandle?: string; defaultRobotsDirective: string }> {
    const settings = await this.getBusinessSettings();
    return {
      defaultOgImageUrl: settings.defaultOgImageUrl,
      metaTitleSuffix: settings.metaTitleSuffix,
      twitterHandle: settings.twitterHandle,
      defaultRobotsDirective: settings.defaultRobotsDirective,
    };
  }
}
