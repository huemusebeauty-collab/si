# Security & Deployment Hardening

## Completed

- Added root `.gitignore` with secret, dependency, build, log, and test-artifact exclusions.
- Added backend/frontend environment templates containing placeholders only.
- Production Swagger is disabled by default; set `SWAGGER_ENABLED=true` only when intentionally exposing it.
- Backend startup no longer runs migration generation or seeding on every boot. Use `npm run migrate` and run seeding explicitly when required.
- Backend binds explicitly to `0.0.0.0` for managed/container hosting.
- `PORT` is accepted as the primary runtime port, with `API_PORT` retained for explicit/local configuration.

## Before first public deployment

1. Generate strong random `JWT_SECRET` and `SESSION_SECRET` values.
2. Set production `DATABASE_URL`, `REDIS_URL`, and storage credentials in the hosting provider's secret/environment settings.
3. Set `CORS_ORIGIN` to the exact frontend origin(s); do not use `*`.
4. Keep `SWAGGER_ENABLED=false` in production unless temporary access is required.
5. Run database migrations as a deployment/release step, not on every application restart.
6. Verify payment/email/SMS providers are not accidentally left in mock mode before accepting real orders.
7. Never commit populated `.env` files or credentials.
