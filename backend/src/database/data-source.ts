import "dotenv/config";
import { DataSource } from "typeorm";

// Sprint 3.4 — Database Foundation: standalone DataSource used by the
// TypeORM CLI (migration:generate/run/revert), separate from the
// NestJS-managed connection in database.module.ts so migrations can run
// outside the app's boot lifecycle.
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: ["src/modules/**/entities/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false, // Sprint 3.4 — schema changes go through migrations only, never auto-sync
  logging: process.env.NODE_ENV === "development",
});
