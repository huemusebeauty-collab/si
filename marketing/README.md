# Silku Marketing HQ — Phase 4

Marketing HQ is a separate, lightweight service for Silku's growth engine.

## Principles

- Keep the storefront lightweight.
- Start on free-tier infrastructure.
- Prefer scheduled/event-driven work over continuous heavy processing.
- AI recommends; approval gates control publishing, spending, discounts, creator commitments, and other consequential actions.
- Every automated job records health, timing, result, retry count, and evidence.
- Monitoring must detect late, stalled, and failed jobs without infinite retries.

## Planned modules

- Marketing Director
- Market Intelligence
- Competitor Radar
- Creator Collaboration CRM
- B2B Opportunity Radar
- Content Engine
- Campaign Engine
- Social Scheduler
- Ads Engine
- Analytics + Attribution
- Learning Engine
- Monitoring + Alerts

## Render deployment setup

Marketing HQ is a Node/TypeScript web service and is designed to run independently from the storefront and backend.

### Service configuration

- **Root directory:** `marketing`
- **Runtime:** Node
- **Plan:** Free (initial setup)
- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- **Health check path:** `/health`
- **Port:** Render-provided `PORT` (the service defaults to `10000` locally)
- **Host binding:** `0.0.0.0`
- **Auto Deploy:** On, after the service is created and verified

### Health endpoints

- `GET /health` — lightweight process/service health check
- `GET /v1/health` — same service health contract
- `GET /v1/marketing/health` — Marketing HQ control-plane health

### Current API surface

- `POST /v1/marketing/evaluate`
- `GET /v1/marketing/approvals`
- `POST /v1/marketing/approvals`
- `POST /v1/marketing/approvals/:id/approve`
- `POST /v1/marketing/approvals/:id/reject`
- `GET /v1/marketing/audit`
- `GET /v1/monitoring/status`
- `POST /v1/monitoring/jobs`
- `POST /v1/monitoring/jobs/:jobKey/running`
- `POST /v1/monitoring/jobs/:jobKey/succeeded`
- `POST /v1/monitoring/jobs/:jobKey/failed`
- Field-force device/visit endpoints under `/v1/field-force/*`

### Deployment safety

Production deployment is intentionally **not** triggered by this commit. Create/configure the Render service only when deployment is explicitly requested. Do not place database URLs, API keys, JWT secrets, ad-platform credentials, or other secrets in Git.

This directory is the Phase 4 foundation. External integrations, persistent queues, scheduled jobs, and production publishing remain incremental follow-up work.