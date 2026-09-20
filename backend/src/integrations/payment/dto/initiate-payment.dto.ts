import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class InitiatePaymentDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ default: "USD" })
  @IsString()
  currency!: string;

  @ApiProperty({ description: "Client-generated idempotency key — reuse the same key on retry, never generate a new one for the same logical attempt." })
  @IsString()
  idempotencyKey!: string;

  @ApiProperty({ required: false, description: "Short-lived server-issued capability for guest checkout ownership." })
  @IsOptional()
  @IsString()
  guestCheckoutToken?: string;
}
