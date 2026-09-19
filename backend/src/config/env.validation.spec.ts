import { validateEnv } from "./env.validation";

const baseEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://example",
  REDIS_URL: "redis://example",
  JWT_SECRET: "jwt-secret",
  SESSION_SECRET: "session-secret",
};

describe("validateEnv port configuration", () => {
  it("accepts PORT without requiring API_PORT", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        PORT: "10000",
      }),
    ).not.toThrow();
  });

  it("accepts legacy API_PORT without requiring PORT", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        API_PORT: "5000",
      }),
    ).not.toThrow();
  });

  it("accepts neither port variable because configuration supplies a local fallback", () => {
    expect(() => validateEnv(baseEnv)).not.toThrow();
  });

  it("rejects an invalid PORT value", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        PORT: "not-a-port",
      }),
    ).toThrow("Invalid environment configuration");
  });
});
