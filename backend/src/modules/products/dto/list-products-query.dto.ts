import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "@/common/dto/pagination-query.dto";

// Sprint 3.6 — filter parameter convention per Phase 8 §5/Phase 1 §7.
// `filters` accepts a flat query-string style map (e.g. finish=matte);
// exact structured-filter schema is finalized alongside Search Services
// (Phase 16 §16.10, out of Sprint 3 scope) — kept generic here so the
// endpoint contract doesn't need to change when that lands.
export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;
}
