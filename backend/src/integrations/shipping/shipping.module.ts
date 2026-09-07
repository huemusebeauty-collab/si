import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SHIPPING_PROVIDER } from "./shipping-provider.interface";
import { MockShippingProvider } from "./providers/mock-shipping.provider";
import { ShippingService } from "./shipping.service";
import { ShippingController } from "./shipping.controller";

@Module({
  imports: [ConfigModule],
  controllers: [ShippingController],
  providers: [
    MockShippingProvider,
    {
      provide: SHIPPING_PROVIDER,
      inject: [ConfigService, MockShippingProvider],
      useFactory: (config: ConfigService, mock: MockShippingProvider) => {
        // Sprint 5.9 — config-driven; only "mock" exists as a real
        // registered provider this sprint (no real carrier integration
        // — Sprint 5 OUT OF SCOPE excludes live shipping bookings), but
        // the factory shape is what a real second provider would slot
        // into, matching the Payment module's pattern.
        void config.get<string>("shipping.provider");
        return mock;
      },
    },
    ShippingService,
  ],
  exports: [ShippingService, SHIPPING_PROVIDER],
})
export class ShippingModule {}
