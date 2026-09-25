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
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
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
    cashfree: {
      appId: process.env.CASHFREE_APP_ID,
      secretKey: process.env.CASHFREE_SECRET_KEY,
      environment: process.env.CASHFREE_ENVIRONMENT ?? "sandbox",
      apiVersion: process.env.CASHFREE_API_VERSION ?? "2025-01-01",
      returnUrl: process.env.CASHFREE_RETURN_URL,
      notifyUrl: process.env.CASHFREE_NOTIFY_URL,
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
