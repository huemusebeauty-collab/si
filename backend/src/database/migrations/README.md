# Migrations

Sprint 3.4 — Database Foundation: migration framework wired via TypeORM
CLI (`pnpm migration:generate` / `migration:run` / `migration:revert`,
see `package.json`, backed by `src/database/data-source.ts`).

**No migrations have been generated or run in Sprint 3** — that requires
a live Postgres connection, which this sandbox does not have (see
`docs/sprint-reports/SPRINT_3_VALIDATION.md`). What exists is the
framework: every entity in `src/modules/*/entities/*.entity.ts` is
`synchronize: false` (per `database.module.ts`), meaning schema changes
*must* go through a generated migration — there is no auto-sync escape
hatch, even in local dev.

## Generating the first migration (real environment)
```bash
pnpm migration:generate src/database/migrations/InitialSchema
pnpm migration:run
```
This is expected to produce one migration file covering every entity
across all 9 domain modules plus auth's `refresh_tokens` table.
