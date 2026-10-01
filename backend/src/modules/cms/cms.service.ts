import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";
import { StaticPageEntity } from "./entities/static-page.entity";
import { BannerEntity } from "./entities/banner.entity";
import { FaqEntryEntity } from "./entities/faq-entry.entity";
import { SocialProfileEntity } from "./entities/social-profile.entity";
import { CMS_PAGE_SEEDS } from "@/database/seeds/data/cms";

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(StaticPageEntity) private readonly pages: Repository<StaticPageEntity>,
    @InjectRepository(BannerEntity) private readonly banners: Repository<BannerEntity>,
    @InjectRepository(FaqEntryEntity) private readonly faqs: Repository<FaqEntryEntity>,
    @InjectRepository(SocialProfileEntity) private readonly socialProfiles: Repository<SocialProfileEntity>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async upsertStaticPage(data: { slug: string; title: string; content: string; metaTitle?: string; metaDescription?: string }): Promise<{ entity: StaticPageEntity; wasCreated: boolean }> {
    const existing = await this.pages.findOne({ where: { slug: data.slug } });
    const entity = existing ?? this.pages.create({ slug: data.slug });
    entity.title = data.title;
    entity.content = data.content;
    entity.metaTitle = data.metaTitle;
    entity.metaDescription = data.metaDescription;
    const saved = await this.pages.save(entity);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return { entity: saved, wasCreated: !existing };
  }

  async deleteStaticPageById(pageId: string): Promise<void> {
    await this.pages.delete({ id: pageId });
    await this.cacheInvalidation.invalidatePrefix("cms");
  }

  async upsertBanner(data: Partial<BannerEntity> & { placement: string; headline: string; startAt: Date; endAt: Date }): Promise<{ entity: BannerEntity; wasCreated: boolean }> {
    const existing = await this.banners.findOne({ where: { placement: data.placement, headline: data.headline } });
    const entity = existing ?? this.banners.create({ placement: data.placement });
    Object.assign(entity, data);
    const saved = await this.banners.save(entity);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return { entity: saved, wasCreated: !existing };
  }

  async deleteBannerById(bannerId: string): Promise<void> {
    await this.banners.delete({ id: bannerId });
    await this.cacheInvalidation.invalidatePrefix("cms");
  }

  async updateBanner(id: string, data: Partial<BannerEntity>): Promise<BannerEntity> {
    const entity = await this.banners.findOne({ where: { id } });
    if (!entity) throw new NotFoundException("Banner not found.");
    Object.assign(entity, data);
    const saved = await this.banners.save(entity);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }

  async upsertFaqByQuestion(faqEntry: { question: string; answer: string; category?: string }, adminId: string): Promise<{ entity: FaqEntryEntity; wasCreated: boolean }> {
    const existing = await this.faqs.findOne({ where: { question: faqEntry.question } });
    const entity = existing ?? this.faqs.create({});
    entity.question = faqEntry.question;
    entity.answer = faqEntry.answer;
    entity.category = faqEntry.category;
    entity.lastEditedByAdminId = adminId;
    const saved = await this.faqs.save(entity);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return { entity: saved, wasCreated: !existing };
  }

  async deleteFaqById(faqId: string): Promise<void> {
    await this.faqs.delete({ id: faqId });
    await this.cacheInvalidation.invalidatePrefix("cms");
  }

  async getStaticPage(slug: string): Promise<StaticPageEntity> {
    const page = await this.pages.findOne({ where: { slug } });
    if (page) return page;
    const seed = CMS_PAGE_SEEDS.find((entry) => entry.slug === slug);
    if (!seed) throw new NotFoundException("Page not found.");
    return this.pages.create({ slug: seed.slug, title: seed.title, content: seed.content, metaTitle: seed.metaTitle, metaDescription: seed.metaDescription });
  }

  async updateStaticPage(slug: string, content: string, adminId: string): Promise<StaticPageEntity> {
    const existing = await this.pages.findOne({ where: { slug } });
    const seed = CMS_PAGE_SEEDS.find((entry) => entry.slug === slug);
    const page = existing ?? this.pages.create({
      slug,
      title: seed?.title ?? slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
      content: seed?.content ?? "",
      metaTitle: seed?.metaTitle,
      metaDescription: seed?.metaDescription,
    });
    page.content = content;
    page.lastEditedByAdminId = adminId;
    const saved = await this.pages.save(page);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }

  async pageSlugExists(slug: string): Promise<boolean> {
    const existing = await this.pages.findOne({ where: { slug } });
    return Boolean(existing);
  }

  async listBanners(placement: string): Promise<BannerEntity[]> {
    const now = new Date();
    return this.banners.find({
      where: { placement, startAt: LessThanOrEqual(now), endAt: MoreThanOrEqual(now) },
      order: { startAt: "ASC" },
    });
  }

  async scheduleBanner(banner: Partial<BannerEntity>, startAt: Date, endAt: Date): Promise<BannerEntity> {
    const saved = await this.banners.save(this.banners.create({ ...banner, startAt, endAt }));
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }

  async listFaqs(category?: string): Promise<FaqEntryEntity[]> {
    return this.faqs.find(category ? { where: { category } } : {});
  }

  async upsertFaq(faqEntry: Partial<FaqEntryEntity> & { id?: string }, adminId: string): Promise<FaqEntryEntity> {
    const entity = this.faqs.create({ ...faqEntry, lastEditedByAdminId: adminId });
    const saved = await this.faqs.save(entity);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }

  private validateSocialUrl(profileUrl: string): string {
    const value = profileUrl.trim();
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      return parsed.toString();
    } catch {
      throw new BadRequestException("Social profile URL must be a valid http(s) URL.");
    }
  }

  async listSocialProfiles(): Promise<SocialProfileEntity[]> {
    return this.socialProfiles.find({
      where: { enabled: true },
      order: { displayOrder: "ASC", platform: "ASC" },
    });
  }

  async listAdminSocialProfiles(): Promise<SocialProfileEntity[]> {
    return this.socialProfiles.find({ order: { displayOrder: "ASC", platform: "ASC" } });
  }

  async upsertSocialProfile(data: Partial<SocialProfileEntity> & { platform: string; profileUrl: string }): Promise<SocialProfileEntity> {
    const platform = data.platform.trim().toLowerCase();
    if (!platform) throw new BadRequestException("Social platform is required.");
    const profileUrl = this.validateSocialUrl(data.profileUrl);
    const existing = await this.socialProfiles.findOne({ where: { platform } });
    const entity = existing ?? this.socialProfiles.create({ platform });
    entity.platform = platform;
    entity.profileUrl = profileUrl;
    entity.enabled = data.enabled ?? true;
    entity.displayOrder = data.displayOrder ?? existing?.displayOrder ?? 0;
    const saved = await this.socialProfiles.save(entity);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }

  async updateSocialProfile(id: string, data: Partial<SocialProfileEntity>): Promise<SocialProfileEntity> {
    const entity = await this.socialProfiles.findOne({ where: { id } });
    if (!entity) throw new NotFoundException("Social profile not found.");
    if (data.platform !== undefined) {
      const platform = data.platform.trim().toLowerCase();
      if (!platform) throw new BadRequestException("Social platform is required.");
      const duplicate = await this.socialProfiles.findOne({ where: { platform } });
      if (duplicate && duplicate.id !== id) throw new BadRequestException("That social platform is already configured.");
      entity.platform = platform;
    }
    if (data.profileUrl !== undefined) entity.profileUrl = this.validateSocialUrl(data.profileUrl);
    if (data.enabled !== undefined) entity.enabled = data.enabled;
    if (data.displayOrder !== undefined) entity.displayOrder = data.displayOrder;
    const saved = await this.socialProfiles.save(entity);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }

  async deleteSocialProfile(id: string): Promise<void> {
    const result = await this.socialProfiles.delete({ id });
    if (!result.affected) throw new NotFoundException("Social profile not found.");
    await this.cacheInvalidation.invalidatePrefix("cms");
  }
}
