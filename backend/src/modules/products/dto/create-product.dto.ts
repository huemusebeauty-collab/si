import { Type } from "class-transformer";
import {
  IsArray, IsNumber, IsOptional, IsString, IsUrl, Max, Min, ValidateNested,
} from "class-validator";

export class ProductFaqDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;
}

export class ProductContentDto {
  @IsString()
  shortDescription!: string;

  @IsArray()
  @IsString({ each: true })
  keyBenefits!: string[];

  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @IsString()
  ingredients!: string;

  @IsArray()
  @IsString({ each: true })
  usageInstructions!: string[];

  @IsString()
  warnings!: string;

  @IsString()
  storageInstructions!: string;

  @IsOptional()
  specifications?: Record<string, string>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductFaqDto)
  faqs!: ProductFaqDto[];
}

export class CreateProductVariantDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  hexColor?: string;

  @IsNumber()
  @Min(0)
  stockQuantity!: number;
}

export class CreateProductDto {
  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsString()
  categorySlug!: string;

  @IsNumber()
  @Min(0.01)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsString()
  description!: string;

  @ValidateNested()
  @Type(() => ProductContentDto)
  content!: ProductContentDto;

  @IsString()
  metaTitle!: string;

  @IsString()
  metaDescription!: string;

  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants!: CreateProductVariantDto[];
}
