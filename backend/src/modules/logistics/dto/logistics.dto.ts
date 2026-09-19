import { IsISO8601, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import type { ShipmentStatus } from "../entities/shipment.entity";

export class CreateShipmentDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsString()
  @Max(80)
  carrier?: string;

  @IsOptional()
  @IsString()
  @Max(80)
  serviceLevel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  weightGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @IsISO8601()
  estimatedDeliveryAt?: string;
}

export class UpdateShipmentStatusDto {
  status!: ShipmentStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Max(160)
  location?: string;

  @IsOptional()
  @IsString()
  @Max(120)
  awbNumber?: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;
}
