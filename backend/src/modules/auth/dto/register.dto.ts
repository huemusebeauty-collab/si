import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

// Sprint 3.7 — Security: password policy (min length/complexity) per
// Phase 8 §6. Complexity regex kept intentionally simple in Sprint 3
// (length + at least one number) — full policy tuning is a Sprint 4+
// UX/security-review item, not a foundation-blocking one.
export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt's input limit
  password!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName!: string;
}
