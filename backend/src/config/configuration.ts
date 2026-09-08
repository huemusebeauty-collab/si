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
    accessTokenTtl: "15m",
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
    // Phase 3A — allow only the real storefront origins to send tracking events.
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://silku.in", "https://www.silku.in"]
        : ["http://localhost:3000"],
  },

  rateLimit: {
    ttlMs: 60_000,
    limit: 100,
  },

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
