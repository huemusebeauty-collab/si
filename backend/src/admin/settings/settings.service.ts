import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BusinessSettingsEntity } from "./entities/business-settings.entity";
import { TaxRateEntity } from "./entities/tax-rate.entity";
import { ShippingZoneEntity } from "./entities/shipping-zone.entity";
import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import { NotificationTemplateEntity } from "./entities/notification-template.entity";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";

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
    return this.business.save(this.business.create({ id: "default", storeName: "Silku", supportEmail: "support@silku.in", currency: "INR" }));
  }

  async updateBusinessSettings(fields: Partial<BusinessSettingsEntity>): Promise<BusinessSettingsEntity> {
    const current = await this.getBusinessSettings(); Object.assign(current, fields);
    const saved = await this.business.save(current); await this.cacheInvalidation.invalidatePrefix("settings"); return saved;
  }
  async listTaxRates(): Promise<TaxRateEntity[]> { return this.taxRates.find({ where: { active: true } }); }
  async upsertTaxRate(data: { region: string; rate: string }): Promise<{ entity: TaxRateEntity; wasCreated: boolean }> {
    const existing = await this.taxRates.findOne({ where: { region: data.region } }); const entity = existing ?? this.taxRates.create({ region: data.region, active: true });
    entity.rate = data.rate; const saved = await this.taxRates.save(entity); await this.cacheInvalidation.invalidatePrefix("settings"); return { entity: saved, wasCreated: !existing };
  }
  async listShippingZones(): Promise<ShippingZoneEntity[]> { return this.shippingZones.find({ where: { active: true } }); }
  async upsertShippingZone(data: { name: string; regions: string[]; methods: { name: string; rate: number; estimatedDaysMin: number; estimatedDaysMax: number }[] }): Promise<{ entity: ShippingZoneEntity; wasCreated: boolean }> {
    const existing = await this.shippingZones.findOne({ where: { name: data.name } }); const entity = existing ?? this.shippingZones.create({ name: data.name, active: true });
    entity.regions = data.regions; entity.methods = data.methods; const saved = await this.shippingZones.save(entity); await this.cacheInvalidation.invalidatePrefix("settings"); return { entity: saved, wasCreated: !existing };
  }
  async listFeatureFlags(): Promise<FeatureFlagEntity[]> { return this.featureFlags.find(); }
  async isFeatureEnabled(key: string): Promise<boolean> { const flag = await this.featureFlags.findOne({ where: { key } }); return flag?.enabled ?? true; }
  async setFeatureFlag(key: string, enabled: boolean, description?: string): Promise<FeatureFlagEntity> {
    const existing = await this.featureFlags.findOne({ where: { key } }); const entity = existing ?? this.featureFlags.create({ key }); entity.enabled = enabled; if (description !== undefined) entity.description = description;
    const saved = await this.featureFlags.save(entity); await this.cacheInvalidation.invalidatePrefix("settings"); return saved;
  }
  async getNotificationTemplateOverride(templateKey: string): Promise<NotificationTemplateEntity | null> { return this.notificationTemplates.findOne({ where: { templateKey } }); }
  async listNotificationTemplateOverrides(): Promise<NotificationTemplateEntity[]> { return this.notificationTemplates.find(); }
  async upsertNotificationTemplate(data: { templateKey: string; subject: string; html: string; text: string }, adminId: string): Promise<NotificationTemplateEntity> {
    const existing = await this.notificationTemplates.findOne({ where: { templateKey: data.templateKey } }); const entity = existing ?? this.notificationTemplates.create({ templateKey: data.templateKey });
    entity.subject = data.subject; entity.html = data.html; entity.text = data.text; entity.lastEditedByAdminId = adminId; const saved = await this.notificationTemplates.save(entity); await this.cacheInvalidation.invalidatePrefix("settings"); return saved;
  }

  async getMediaSettings(): Promise<{ maxUploadSizeBytes: number; allowedMimeTypes: string[]; minImageDimensionPx: number }> {
    const settings = await this.getBusinessSettings();
    const mediaTypes = Array.from(new Set([...settings.allowedMimeTypes, "video/mp4", "video/webm"]));
    return { maxUploadSizeBytes: Math.max(settings.maxUploadSizeBytes, 50 * 1024 * 1024), allowedMimeTypes: mediaTypes, minImageDimensionPx: settings.minImageDimensionPx };
  }
  async getSeoDefaults(): Promise<{ defaultOgImageUrl?: string; metaTitleSuffix?: string; twitterHandle?: string; defaultRobotsDirective: string }> {
    const settings = await this.getBusinessSettings(); return { defaultOgImageUrl: settings.defaultOgImageUrl, metaTitleSuffix: settings.metaTitleSuffix, twitterHandle: settings.twitterHandle, defaultRobotsDirective: settings.defaultRobotsDirective };
  }
}
