import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SettingsService } from "../settings.service";
import { BusinessSettingsEntity } from "../entities/business-settings.entity";
import { TaxRateEntity } from "../entities/tax-rate.entity";
import { ShippingZoneEntity } from "../entities/shipping-zone.entity";
import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import { NotificationTemplateEntity } from "../entities/notification-template.entity";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";

function createMockRepo() {
  return { findOne: jest.fn(), find: jest.fn(), save: jest.fn((e: unknown) => Promise.resolve(e)), create: jest.fn((e: unknown) => e) };
}

// Sprint 7.5 — Business Rule Tests: feature-flag default behavior, and
// the natural-key upsert correction for tax rates/shipping zones (the
// bug this sprint found — "upsert" that only worked by a UUID the
// caller already had).
describe("SettingsService", () => {
  let service: SettingsService;
  let repos: {
    business: ReturnType<typeof createMockRepo>;
    taxRates: ReturnType<typeof createMockRepo>;
    shippingZones: ReturnType<typeof createMockRepo>;
    featureFlags: ReturnType<typeof createMockRepo>;
    notificationTemplates: ReturnType<typeof createMockRepo>;
  };

  beforeEach(async () => {
    repos = {
      business: createMockRepo(),
      taxRates: createMockRepo(),
      shippingZones: createMockRepo(),
      featureFlags: createMockRepo(),
      notificationTemplates: createMockRepo(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(BusinessSettingsEntity), useValue: repos.business },
        { provide: getRepositoryToken(TaxRateEntity), useValue: repos.taxRates },
        { provide: getRepositoryToken(ShippingZoneEntity), useValue: repos.shippingZones },
        { provide: getRepositoryToken(FeatureFlagEntity), useValue: repos.featureFlags },
        { provide: getRepositoryToken(NotificationTemplateEntity), useValue: repos.notificationTemplates },
        { provide: CacheInvalidationService, useValue: { invalidatePrefix: jest.fn() } },
      ],
    }).compile();
    service = module.get(SettingsService);
  });

  describe("isFeatureEnabled", () => {
    it("returns true for a flag that has never been explicitly set (permissive default)", async () => {
      repos.featureFlags.findOne.mockResolvedValue(null);
      await expect(service.isFeatureEnabled("some.unregistered.flag")).resolves.toBe(true);
    });

    it("returns false for a flag explicitly disabled", async () => {
      repos.featureFlags.findOne.mockResolvedValue({ key: "search.enabled", enabled: false });
      await expect(service.isFeatureEnabled("search.enabled")).resolves.toBe(false);
    });

    it("returns true for a flag explicitly enabled", async () => {
      repos.featureFlags.findOne.mockResolvedValue({ key: "coupons.enabled", enabled: true });
      await expect(service.isFeatureEnabled("coupons.enabled")).resolves.toBe(true);
    });
  });

  describe("upsertTaxRate — natural-key correction", () => {
    it("creates a new tax rate when no row exists for that region", async () => {
      repos.taxRates.findOne.mockResolvedValue(null);
      const result = await service.upsertTaxRate({ region: "US-CA", rate: "0.0725" });
      expect(result.wasCreated).toBe(true);
    });

    it("updates the EXISTING row for that region rather than creating a duplicate on a repeat call", async () => {
      const existingRow = { id: "existing-uuid", region: "US-CA", rate: "0.06", active: true };
      repos.taxRates.findOne.mockResolvedValue(existingRow);
      const result = await service.upsertTaxRate({ region: "US-CA", rate: "0.0725" });
      expect(result.wasCreated).toBe(false);
      expect(repos.taxRates.create).not.toHaveBeenCalled(); // must NOT create a fresh entity when one already exists
    });
  });

  describe("upsertShippingZone — natural-key correction", () => {
    it("updates the existing zone for a repeated name rather than creating a duplicate", async () => {
      const existingZone = { id: "existing-uuid", name: "Continental US", regions: [], methods: [], active: true };
      repos.shippingZones.findOne.mockResolvedValue(existingZone);
      const result = await service.upsertShippingZone({ name: "Continental US", regions: ["US-CA"], methods: [] });
      expect(result.wasCreated).toBe(false);
    });
  });

  describe("getNotificationTemplateOverride", () => {
    it("returns null (not a thrown error) when no override exists — EmailService's fallback depends on this", async () => {
      repos.notificationTemplates.findOne.mockResolvedValue(null);
      await expect(service.getNotificationTemplateOverride("welcome")).resolves.toBeNull();
    });
  });
});
