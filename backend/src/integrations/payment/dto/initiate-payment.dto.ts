import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive, IsString } from "class-validator";

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
}
