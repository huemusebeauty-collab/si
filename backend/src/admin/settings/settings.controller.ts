import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { Audit } from "@/admin/audit/audit.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { BusinessSettingsEntity } from "./entities/business-settings.entity";
import type { ShippingZoneEntity } from "./entities/shipping-zone.entity";

@ApiTags("admin-settings")
@ApiBearerAuth()
@Controller({ path: "admin/settings", version: "1" })
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Sprint 7 — @Public(): the storefront footer/Contact Us page (Phase
  // 6 §10's own stated consumers) needs to read business settings
  // without an admin session — Website Settings itself remains
  // Super-Admin-only to *write*.
  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "settings" })
  @Get("business")
  getBusinessSettings() {
    return this.settings.getBusinessSettings();
  }

  @RequirePermission("settings", "full")
  @Audit("settings", "update")
  @Patch("business")
  updateBusinessSettings(@Body() fields: Partial<BusinessSettingsEntity>) {
    return this.settings.updateBusinessSettings(fields);
  }

  @RequirePermission("settings", "view")
  @Get("tax-rates")
  listTaxRates() {
    return this.settings.listTaxRates();
  }

  @RequirePermission("settings", "full")
  @Audit("settings", "update")
  @Post("tax-rates")
  upsertTaxRate(@Body() body: { region: string; rate: string }) {
    return this.settings.upsertTaxRate(body);
  }

  @RequirePermission("settings", "view")
  @Get("shipping-zones")
  listShippingZones() {
    return this.settings.listShippingZones();
  }

  @RequirePermission("settings", "full")
  @Audit("settings", "update")
  @Post("shipping-zones")
  upsertShippingZone(@Body() body: Pick<ShippingZoneEntity, "name" | "regions" | "methods">) {
    return this.settings.upsertShippingZone(body);
  }

  // Sprint 7.5 — Feature Flags.
  @RequirePermission("settings", "view")
  @Get("feature-flags")
  listFeatureFlags() {
    return this.settings.listFeatureFlags();
  }

  @RequirePermission("settings", "full")
  @Audit("settings", "update")
  @Patch("feature-flags/:key")
  setFeatureFlag(@Param("key") key: string, @Body() body: { enabled: boolean; description?: string }) {
    return this.settings.setFeatureFlag(key, body.enabled, body.description);
  }

  // Sprint 7.5 — Notification Templates.
  @RequirePermission("settings", "view")
  @Get("notification-templates")
  listNotificationTemplates() {
    return this.settings.listNotificationTemplateOverrides();
  }

  @RequirePermission("settings", "full")
  @Audit("settings", "update")
  @Post("notification-templates")
  upsertNotificationTemplate(@CurrentUser() user: AuthenticatedUser, @Body() body: { templateKey: string; subject: string; html: string; text: string }) {
    return this.settings.upsertNotificationTemplate(body, user.id);
  }

  // Sprint 7.5 — SEO Defaults + Media Settings: public, read-only
  // reference endpoints (same reasoning as `business` above — the
  // storefront and any future frontend media-upload widget need these
  // without an admin session; writing them still goes through
  // `PATCH .../business` since they're columns on BusinessSettingsEntity,
  // not separate entities).
  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "settings" })
  @Get("seo-defaults")
  getSeoDefaults() {
    return this.settings.getSeoDefaults();
  }

  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "settings" })
  @Get("media-settings")
  getMediaSettings() {
    return this.settings.getMediaSettings();
  }

  // Sprint 7.5 — Branding. Per Phase 6 §10 (carried since Sprint 7):
  // "read-only reference to Phase 4 tokens, not a theme editor." This
  // endpoint satisfies Sprint 7.5's "branding" deliverable by exposing
  // the ACTUAL Phase 4 design tokens the frontend already uses
  // (frontend/src/styles/tokens/colors.css + typography.css, Sprint 2)
  // as reference data an admin can view — not a second, editable copy
  // that could drift from what's really rendered. There is
  // deliberately no PATCH/POST for branding.
  //
  // Sprint 7.5 correction: the first draft of this endpoint had 5 of
  // 10 color values WRONG — written from memory/approximation instead
  // of actually reading frontend/src/styles/tokens/colors.css. Caught
  // by checking the real file before calling this done, not assumed
  // correct because it "looked right." Values below are copy-verified
  // against that file, not retyped from memory a second time.
  @Public()
  @Get("branding")
  getBrandingReference() {
    return {
      readOnly: true,
      note: "Branding tokens are defined in frontend/src/styles/tokens/colors.css and typography.css (Phase 4/Sprint 2) and are not editable through this API — changing brand colors/typography requires a design-system change, not an admin setting.",
      colors: {
        primaryPlum: "#6B2247",
        primaryRose: "#B5486B",
        secondaryGold: "#9C7A3C",
        secondaryBlush: "#F2E4E0",
        neutralInk: "#231F20",
        neutralCharcoal: "#3D3A38",
        neutralStone: "#6E6660",
        neutralMist: "#A8A29B",
        neutralFog: "#D9CFC7",
        neutralPaper: "#FBF7F4",
        success: "#3F7D58",
        error: "#B3261E",
      },
      typography: { display: "Fraunces", body: "Inter" },
    };
  }
}
