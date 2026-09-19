import { IsISO8601, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import type { ShipmentStatus } from "../entities/shipment.entity";

export class CreateShipmentDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
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
  @IsIn(["draft","ready_to_ship","pickup_scheduled","picked_up","in_transit","out_for_delivery","delivered","delivery_failed","rto","return_requested","return_in_transit","returned","cancelled"])
  status!: ShipmentStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  awbNumber?: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;
}
