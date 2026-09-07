import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BusinessSettingsEntity } from "./entities/business-settings.entity";
import { TaxRateEntity } from "./entities/tax-rate.entity";
import { ShippingZoneEntity } from "./entities/shipping-zone.entity";
import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import { NotificationTemplateEntity } from "./entities/notification-template.entity";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";

@Module({
  imports: [TypeOrmModule.forFeature([BusinessSettingsEntity, TaxRateEntity, ShippingZoneEntity, FeatureFlagEntity, NotificationTemplateEntity])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
