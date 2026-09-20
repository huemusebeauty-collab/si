import { plainToInstance } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min, validateSync } from "class-validator";

enum Environment {
  Development = "development",
  Test = "test",
  Production = "production",
}

enum PaymentProvider {
  Mock = "mock",
  Stripe = "stripe",
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

  @IsOptional()
  @IsString()
  STORAGE_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  STORAGE_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  STORAGE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STORAGE_BUCKET?: string;

  @IsOptional()
  @IsString()
  STORAGE_PUBLIC_BASE_URL?: string;

  @IsOptional()
  @IsEnum(PaymentProvider)
  PAYMENT_PROVIDER?: PaymentProvider;

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;
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

  if (config.NODE_ENV === Environment.Production) {
    if (typeof config.STORAGE_PUBLIC_BASE_URL !== "string" || !config.STORAGE_PUBLIC_BASE_URL) {
      throw new Error("Invalid environment configuration: STORAGE_PUBLIC_BASE_URL is required in production.");
    }
  }

  const provider = config.PAYMENT_PROVIDER ?? "mock";

  // Production must explicitly declare the payment provider. Never silently
  // fall back to the mock provider because a deployment variable is missing.
  if (config.NODE_ENV === Environment.Production && typeof config.PAYMENT_PROVIDER !== "string") {
    throw new Error("Invalid environment configuration: PAYMENT_PROVIDER must be explicitly set in production.");
  }

  if (provider === "stripe") {
    if (typeof config.STRIPE_SECRET_KEY !== "string" || !config.STRIPE_SECRET_KEY) {
      throw new Error("Invalid environment configuration: STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe.");
    }
    if (typeof config.STRIPE_WEBHOOK_SECRET !== "string" || !config.STRIPE_WEBHOOK_SECRET) {
      throw new Error("Invalid environment configuration: STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=stripe.");
    }
  }

  return validated;
}
