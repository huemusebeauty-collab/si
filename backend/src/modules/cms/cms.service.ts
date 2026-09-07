import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";
import { StaticPageEntity } from "./entities/static-page.entity";
import { BannerEntity } from "./entities/banner.entity";
import { FaqEntryEntity } from "./entities/faq-entry.entity";

// Sprint 3.5 — CmsService, method signatures per Phase 16 §16.11.
@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(StaticPageEntity) private readonly pages: Repository<StaticPageEntity>,
    @InjectRepository(BannerEntity) private readonly banners: Repository<BannerEntity>,
    @InjectRepository(FaqEntryEntity) private readonly faqs: Repository<FaqEntryEntity>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  // Sprint 7.4 — was missing entirely: `updateStaticPage` requires the
  // page to already exist (throws via `getStaticPage`), so there was
  // no way to CREATE a new static page at all outside a raw seed
  // script. Real upsert-by-slug, for SeedCmsPagesProvider.
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

  // Sprint 7.4.7 — Idempotent Seeding: `scheduleBanner` (Sprint 3)
  // always inserts a new row — calling it on every seed run would
  // create duplicate banners. Upserts by (placement, headline) as the
  // natural key, since Banner has no other unique-ish field.
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

  // Sprint 7.4.7 — same idempotency fix as banners: `upsertFaq` (Sprint
  // 3, despite its name) always created a new row when no `id` was
  // passed. Upserts by question text as the natural key.
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

  // getStaticPage(slug) -> StaticPage
  async getStaticPage(slug: string): Promise<StaticPageEntity> {
    const page = await this.pages.findOne({ where: { slug } });
    if (!page) throw new NotFoundException("Page not found.");
    return page;
  }

  // updateStaticPage(slug, content, adminId) -> StaticPage
  async updateStaticPage(slug: string, content: string, adminId: string): Promise<StaticPageEntity> {
    const page = await this.getStaticPage(slug);
    page.content = content;
    page.lastEditedByAdminId = adminId;
    const saved = await this.pages.save(page);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }

  // listBanners(placement) -> Banner[]
  // Phase 16 §16.11: "Banners activate/deactivate automatically based on
  // startAt/endAt" — filtered here rather than requiring a background job.
  // Sprint 7.3 — for ContentValidationService (Phase 8 §3 boundary rule).
  async pageSlugExists(slug: string): Promise<boolean> {
    const existing = await this.pages.findOne({ where: { slug } });
    return Boolean(existing);
  }

  async listBanners(placement: string): Promise<BannerEntity[]> {
    const now = new Date();
    return this.banners.find({
      where: { placement, startAt: LessThanOrEqual(now), endAt: MoreThanOrEqual(now) },
    });
  }

  // scheduleBanner(banner, startAt, endAt) -> Banner
  async scheduleBanner(banner: Partial<BannerEntity>, startAt: Date, endAt: Date): Promise<BannerEntity> {
    const saved = await this.banners.save(this.banners.create({ ...banner, startAt, endAt }));
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }

  // listFaqs(category?) -> FaqEntry[]
  async listFaqs(category?: string): Promise<FaqEntryEntity[]> {
    return this.faqs.find(category ? { where: { category } } : {});
  }

  // upsertFaq(faqEntry, adminId) -> FaqEntry
  async upsertFaq(faqEntry: Partial<FaqEntryEntity> & { id?: string }, adminId: string): Promise<FaqEntryEntity> {
    const entity = this.faqs.create({ ...faqEntry, lastEditedByAdminId: adminId });
    const saved = await this.faqs.save(entity);
    await this.cacheInvalidation.invalidatePrefix("cms");
    return saved;
  }
}
