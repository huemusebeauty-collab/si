import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AdminAuthModule } from "./auth/admin-auth.module";
import { AuditModule } from "./audit/audit.module";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ReportsModule } from "./reports/reports.module";
import { CouponsModule } from "./coupons/coupons.module";
import { ImportExportModule } from "./import-export/import-export.module";
import { PermissionsGuard } from "./common/permissions.guard";
import { ContentValidationModule } from "./content-validation/content-validation.module";
import { SettingsModule } from "./settings/settings.module";

// Sprint 6 — single entry point AppModule imports for the whole admin
// layer, matching this sprint's own deliverable grouping (auth/RBAC ->
// dashboard -> reports -> coupons -> import/export -> audit, applied
// globally via APP_GUARD/APP_INTERCEPTOR).
// Sprint 7/7.3 — ContentValidationModule and SettingsModule added.
@Module({
  imports: [
    AdminAuthModule,
    AuditModule,
    DashboardModule,
    ReportsModule,
    CouponsModule,
    ImportExportModule,
    ContentValidationModule,
    SettingsModule,
  ],
  providers: [
    // Sprint 6 — PermissionsGuard runs alongside Sprint 3's JwtAuthGuard
    // and RolesGuard (all three are global APP_GUARDs) — JwtAuthGuard
    // establishes identity, RolesGuard/PermissionsGuard both check
    // authorization from two different metadata sources
    // (@Roles vs @RequirePermission), each a no-op when its own
    // metadata isn't present on a given endpoint.
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AdminModule {}
