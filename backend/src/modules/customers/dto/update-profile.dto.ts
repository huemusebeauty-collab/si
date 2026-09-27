import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(15)
  @Matches(/^$|^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/, { message: "GSTIN format is invalid." })
  gstin?: string;
}
