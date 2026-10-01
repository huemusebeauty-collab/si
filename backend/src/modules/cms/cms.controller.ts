import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CmsService } from "./cms.service";
import { Public } from "@/common/decorators/public.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { BannerEntity } from "./entities/banner.entity";
import type { FaqEntryEntity } from "./entities/faq-entry.entity";
import type { SocialProfileEntity } from "./entities/social-profile.entity";

@ApiTags("cms")
@Controller({ path: "cms", version: "1" })
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Cacheable({ ttlSeconds: 120, keyPrefix: "cms" })
  @Get("pages/:slug")
  getPage(@Param("slug") slug: string) {
    return this.cms.getStaticPage(slug);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Patch("pages/:slug")
  updatePage(@CurrentUser() user: AuthenticatedUser, @Param("slug") slug: string, @Body("content") content: string) {
    return this.cms.updateStaticPage(slug, content, user.id);
  }

  @Public()
  @Cacheable({ ttlSeconds: 60, keyPrefix: "cms" })
  @Get("banners")
  listBanners(@Query("placement") placement: string) {
    return this.cms.listBanners(placement);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Post("banners")
  scheduleBanner(@Body() body: Partial<BannerEntity> & { startAt: string; endAt: string }) {
    return this.cms.scheduleBanner(body, new Date(body.startAt), new Date(body.endAt));
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Patch("banners/:id")
  updateBanner(@Param("id") id: string, @Body() body: Partial<BannerEntity> & { startAt?: string; endAt?: string }) {
    return this.cms.updateBanner(id, {
      ...body,
      ...(body.startAt ? { startAt: new Date(body.startAt) } : {}),
      ...(body.endAt ? { endAt: new Date(body.endAt) } : {}),
    });
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Delete("banners/:id")
  async deleteBanner(@Param("id") id: string) {
    await this.cms.deleteBannerById(id);
    return { deleted: true };
  }

  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "cms" })
  @Get("faqs")
  listFaqs(@Query("category") category?: string) {
    return this.cms.listFaqs(category);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Post("faqs")
  upsertFaq(@CurrentUser() user: AuthenticatedUser, @Body() body: Partial<FaqEntryEntity>) {
    return this.cms.upsertFaq(body, user.id);
  }

  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "cms" })
  @Get("social")
  listSocialProfiles() {
    return this.cms.listSocialProfiles();
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Get("social/admin")
  listAdminSocialProfiles() {
    return this.cms.listAdminSocialProfiles();
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Post("social")
  createSocialProfile(@Body() body: Partial<SocialProfileEntity> & { platform: string; profileUrl: string }) {
    return this.cms.upsertSocialProfile(body);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Patch("social/:id")
  updateSocialProfile(@Param("id") id: string, @Body() body: Partial<SocialProfileEntity>) {
    return this.cms.updateSocialProfile(id, body);
  }

  @ApiBearerAuth()
  @Roles("admin")
  @Delete("social/:id")
  async deleteSocialProfile(@Param("id") id: string) {
    await this.cms.deleteSocialProfile(id);
    return { deleted: true };
  }
}
