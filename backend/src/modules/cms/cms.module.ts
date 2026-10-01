import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StaticPageEntity } from "./entities/static-page.entity";
import { BannerEntity } from "./entities/banner.entity";
import { FaqEntryEntity } from "./entities/faq-entry.entity";
import { SocialProfileEntity } from "./entities/social-profile.entity";
import { CmsService } from "./cms.service";
import { CmsController } from "./cms.controller";

@Module({
  imports: [TypeOrmModule.forFeature([StaticPageEntity, BannerEntity, FaqEntryEntity, SocialProfileEntity])],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
