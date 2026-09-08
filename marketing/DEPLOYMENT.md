# Silku Marketing HQ — Deployment

Marketing HQ is designed as a separate lightweight Node.js service so the storefront remains independent.

## Render service configuration

- Runtime: Node
- Root directory: `marketing`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Port: use Render's `PORT` environment variable (default `10000` locally)
- Host: `0.0.0.0`
- Auto deploy: enabled after the service is intentionally created

## Health checks

- `GET /health`
- `GET /v1/marketing/health`
- `GET /v1/monitoring/status`

## Core API

- `POST /v1/marketing/evaluate`
- `GET /v1/marketing/approvals`
- `POST /v1/marketing/approvals`
- `POST /v1/marketing/approvals/:requestId/approve`
- `POST /v1/marketing/approvals/:requestId/reject`
- `GET /v1/marketing/audit`

## Monitoring

Marketing jobs are monitored in-process with a lightweight 60-second inspection loop. Jobs can be marked running, succeeded, or failed, with retry/stall alerts handled by the monitoring layer.

Production platform credentials, OAuth secrets, ad spend limits, and external provider keys must be added through Render environment variables only; never commit secrets to Git.

## Deployment policy

This file documents the production configuration but does not create or deploy the Render service automatically. Production deployment should happen only after the Marketing HQ foundation passes a local/typecheck/build verification.
