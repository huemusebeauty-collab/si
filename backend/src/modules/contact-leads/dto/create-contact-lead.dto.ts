import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateContactLeadDto {
  @ApiProperty({ example: "Priya Sharma" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: "priya@example.com" })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: "+91 9876543210" })
  @IsString()
  @Matches(/^\+?[0-9][0-9\s().-]{7,19}$/, { message: "phone must be a valid phone number" })
  phone!: string;

  @ApiProperty({ example: "123, Example Street, Jaipur, Rajasthan 303005" })
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  address!: string;
}
