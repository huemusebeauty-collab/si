import { plainToInstance } from "class-transformer";
import { IsEnum, IsInt, IsString, Min, validateSync } from "class-validator";

// Sprint 3.1 — Configuration validation. App fails fast at boot with a
// clear error if a required environment variable is missing, per Sprint
// 1's CI_CD_FOUNDATION.md commitment ("each package validates its
// required environment variables at startup").
enum Environment {
  Development = "development",
  Test = "test",
  Production = "production",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @Min(1)
  API_PORT!: number;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  SESSION_SECRET!: string;

  @IsString()
  STORAGE_ENDPOINT!: string;

  @IsString()
  STORAGE_ACCESS_KEY!: string;

  @IsString()
  STORAGE_SECRET_KEY!: string;

  @IsString()
  STORAGE_BUCKET!: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(", "))
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return validated;
}
