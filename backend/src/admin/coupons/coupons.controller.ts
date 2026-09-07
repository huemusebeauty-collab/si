import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CouponsService } from "./coupons.service";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { Audit } from "@/admin/audit/audit.decorator";
import type { DiscountType } from "./entities/coupon.entity";
import { PaginationQueryDto } from "@/common/dto/pagination-query.dto";

@ApiTags("admin-coupons")
@ApiBearerAuth()
@Controller({ path: "admin/coupons", version: "1" })
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @RequirePermission("coupons", "full")
  @Audit("coupons", "create")
  @Post()
  create(@Body() body: { code: string; discountType: DiscountType; discountValue: number; startAt: string; endAt: string; usageLimit?: number }) {
    return this.coupons.create({ ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) });
  }

  @RequirePermission("coupons", "view")
  @Get()
  list(@Query() query: PaginationQueryDto & { activeOnly?: boolean }) {
    return this.coupons.list(query);
  }

  @RequirePermission("coupons", "full")
  @Audit("coupons", "status_change")
  @Patch(":couponId/active")
  setActive(@Param("couponId") couponId: string, @Body("active") active: boolean) {
    return this.coupons.setActive(couponId, active);
  }
}
