import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CouponEntity, type DiscountType } from "./entities/coupon.entity";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";

// Sprint 6 — CouponsService: real validation + discount computation,
// replacing Sprint 4's store-only stub in CartService.applyCoupon.
@Injectable()
export class CouponsService {
  constructor(@InjectRepository(CouponEntity) private readonly coupons: Repository<CouponEntity>) {}

  async create(data: { code: string; discountType: DiscountType; discountValue: number; startAt: Date; endAt: Date; usageLimit?: number }): Promise<CouponEntity> {
    return this.coupons.save(this.coupons.create({ ...data, discountValue: data.discountValue.toFixed(2) }));
  }

  // Sprint 7.4.7 — Idempotent Seeding: `create` (Sprint 6) always
  // inserts — upserts by `code` as the natural key, for
  // SeedCouponsProvider.
  async upsertByCode(data: { code: string; discountType: DiscountType; discountValue: number; startAt: Date; endAt: Date; usageLimit?: number }): Promise<{ entity: CouponEntity; wasCreated: boolean }> {
    const existing = await this.coupons.findOne({ where: { code: data.code } });
    const entity = existing ?? this.coupons.create({ code: data.code, active: true, timesRedeemed: 0 });
    entity.discountType = data.discountType;
    entity.discountValue = data.discountValue.toFixed(2);
    entity.startAt = data.startAt;
    entity.endAt = data.endAt;
    entity.usageLimit = data.usageLimit;
    const saved = await this.coupons.save(entity);
    return { entity: saved, wasCreated: !existing };
  }

  async deleteById(couponId: string): Promise<void> {
    await this.coupons.delete({ id: couponId });
  }

  async list(filters: { activeOnly?: boolean; page: number; pageSize: number }) {
    const qb = this.coupons.createQueryBuilder("coupon").orderBy("coupon.createdAt", "DESC");
    if (filters.activeOnly) qb.andWhere("coupon.active = true");
    const [items, totalItems] = await qb.skip((filters.page - 1) * filters.pageSize).take(filters.pageSize).getManyAndCount();
    return { items, totalItems };
  }

  async setActive(couponId: string, active: boolean): Promise<CouponEntity> {
    const coupon = await this.coupons.findOneOrFail({ where: { id: couponId } });
    coupon.active = active;
    return this.coupons.save(coupon);
  }

  // Sprint 6/4.4 — validates a code and computes the discount amount
  // against a given subtotal. Called from CartService.applyCoupon,
  // replacing Sprint 4's "store the code, compute nothing" stub.
  async validateAndComputeDiscount(code: string, subtotal: number): Promise<{ coupon: CouponEntity; discountAmount: number }> {
    const coupon = await this.coupons.findOne({ where: { code } });
    if (!coupon) throw new NotFoundException("Coupon code not found.");
    if (!coupon.active) {
      throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, "This coupon is not active.");
    }
    const now = new Date();
    if (now < coupon.startAt || now > coupon.endAt) {
      throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, "This coupon is not currently valid.");
    }
    if (coupon.usageLimit !== undefined && coupon.usageLimit !== null && coupon.timesRedeemed >= coupon.usageLimit) {
      throw new DomainException(DomainErrorCode.INVALID_STATUS_TRANSITION, "This coupon has reached its usage limit.");
    }

    const discountAmount =
      coupon.discountType === "percentage"
        ? subtotal * (Number(coupon.discountValue) / 100)
        : Math.min(Number(coupon.discountValue), subtotal);

    return { coupon, discountAmount: Math.round(discountAmount * 100) / 100 };
  }

  async recordRedemption(couponId: string): Promise<void> {
    await this.coupons.increment({ id: couponId }, "timesRedeemed", 1);
  }

  // Sprint 6 — Reports: Coupons report (Phase 6 §11 — redemption counts
  // and total discount value per coupon). Sprint 6 scope: redemption
  // count is tracked (`timesRedeemed`); total discount value per coupon
  // is NOT tracked (would need a per-redemption ledger, not just a
  // counter) — flagged in Known Issues.
  async getCouponsReport(): Promise<CouponEntity[]> {
    return this.coupons.find({ order: { timesRedeemed: "DESC" } });
  }
}
