import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

// Sprint 3.6 — API Foundation / Phase 8 §5 & Phase 16 §16.15: consistent
// pagination, filtering, sorting parameter convention across every list
// endpoint (Products, Orders, Reviews, etc.) — defined once here, not
// reimplemented per module.
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ description: "e.g. price, -price, createdAt" })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class PaginatedMeta {
  page!: number;
  pageSize!: number;
  totalItems!: number;
  totalPages!: number;
}

export class PaginatedResponse<T> {
  items!: T[];
  meta!: PaginatedMeta;

  static of<T>(items: T[], totalItems: number, page: number, pageSize: number): PaginatedResponse<T> {
    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  }
}
