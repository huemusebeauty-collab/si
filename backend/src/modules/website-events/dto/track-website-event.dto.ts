import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsISO8601, IsObject, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { WEBSITE_EVENT_NAMES } from "../entities/website-event.entity";

export class TrackWebsiteEventDto {
  @ApiProperty({ enum: WEBSITE_EVENT_NAMES })
  @IsIn(WEBSITE_EVENT_NAMES)
  eventName!: (typeof WEBSITE_EVENT_NAMES)[number];

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  sessionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  anonymousId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2048)
  path!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  medium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  campaign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
