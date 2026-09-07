import { Global, Module } from "@nestjs/common";
import { IntegrationLoggerService } from "./integration-logger.service";
import { ProviderStatusService } from "./provider-status.service";
import { ResilientCallService } from "./resilient-call.service";

// Sprint 5.1 — shared infrastructure every integration sub-module
// (Payment, Shipping, Email, SMS, Webhooks) depends on. @Global() for
// the same reason as CacheUtilsModule (Sprint 4) — these are stateless
// utility services with no reason to require per-module re-registration.
@Global()
@Module({
  providers: [IntegrationLoggerService, ProviderStatusService, ResilientCallService],
  exports: [IntegrationLoggerService, ProviderStatusService, ResilientCallService],
})
export class IntegrationCommonModule {}
