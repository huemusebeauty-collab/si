// Sprint 3.1/3.2 — Configuration service source. Grouped by concern so
// each module injects only the slice it needs (e.g. `config.get('database')`)
// rather than reading raw `process.env` anywhere outside this file.
export default () => ({
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.API_PORT ?? "4000", 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenTtl: "15m", // Sprint 3.3 — Authentication Foundation
    refreshTokenTtl: "30d",
  },

  session: {
    secret: process.env.SESSION_SECRET,
  },

  storage: {
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secretKey: process.env.STORAGE_SECRET_KEY,
    bucket: process.env.STORAGE_BUCKET,
  },

  cors: {
    // Sprint 3.7 — Security: no wildcard origin; frontend dev server only
    // in Sprint 3 (no deployed origin exists yet — Sprint 3 OUT OF SCOPE
    // excludes production deployment).
    origin: process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"],
  },

  rateLimit: {
    // Phase 8 §7 / Phase 16 §16.14 — applied to auth, search, checkout
    // endpoints specifically (see ThrottlerGuard usage per-controller),
    // this is the default/global fallback.
    ttlMs: 60_000,
    limit: 100,
  },

  // Sprint 5.9 — Secrets & Configuration: every third-party provider
  // selected here, config-driven, defaulting to "mock" everywhere since
  // live credentials are out of scope this sprint. Changing a provider
  // is a config change only — no code change, per Sprint 5.1's
  // provider-abstraction requirement.
  payment: {
    provider: process.env.PAYMENT_PROVIDER ?? "mock",
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },
  shipping: {
    provider: process.env.SHIPPING_PROVIDER ?? "mock",
  },
  email: {
    provider: process.env.EMAIL_PROVIDER ?? "mock",
    fromAddress: process.env.EMAIL_FROM_ADDRESS ?? "no-reply@huemusebeauty.local",
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? "mock",
    otpTtlSeconds: 300,
    otpRateLimitPerHour: 5,
  },
});
