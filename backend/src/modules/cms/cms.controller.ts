import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CmsService } from "./cms.service";
import { Public } from "@/common/decorators/public.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { BannerEntity } from "./entities/banner.entity";
import type { FaqEntryEntity } from "./entities/faq-entry.entity";

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
  @Cacheable({ ttlSeconds: 60, keyPrefix: "cms" }) // shorter TTL — banners are schedule-sensitive (startAt/endAt)
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
}
