import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export const MANUAL_PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer", "other"] as const;
export const MANUAL_DISCOUNT_TYPES = ["percentage", "amount"] as const;
export type ManualDiscountType = (typeof MANUAL_DISCOUNT_TYPES)[number];
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export class ManualBillingItemDto {
  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsIn(MANUAL_DISCOUNT_TYPES)
  discountType?: ManualDiscountType;

  @IsOptional()
  @Min(0)
  discountValue?: number;

  /** @deprecated Kept for backward compatibility with older admin clients. */
  @IsOptional()
  @Min(0)
  discountAmount?: number;
}

export class CreateManualBillingDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerGstin?: string;

  @IsOptional()
  billingAddress?: Record<string, unknown>;

  @IsOptional()
  shippingAddress?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualBillingItemDto)
  items!: ManualBillingItemDto[];

  @IsIn(MANUAL_PAYMENT_METHODS)
  paymentMethod!: ManualPaymentMethod;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
