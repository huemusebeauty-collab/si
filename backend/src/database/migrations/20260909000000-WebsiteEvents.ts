import { MigrationInterface, QueryRunner } from "typeorm";

export class WebsiteEvents20260909000000 implements MigrationInterface {
  name = "WebsiteEvents20260909000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "website_events" (
      "event_id" uuid NOT NULL,
      "event_name" text NOT NULL,
      "session_id" text NOT NULL,
      "anonymous_id" text,
      "path" text NOT NULL,
      "referrer" text,
      "source" text,
      "medium" text,
      "campaign" text,
      "product_id" text,
      "order_id" text,
      "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "occurred_at" TIMESTAMPTZ NOT NULL,
      "received_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "PK_website_events_event_id" PRIMARY KEY ("event_id")
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_website_events_occurred_at" ON "website_events" ("occurred_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_website_events_event_name_occurred_at" ON "website_events" ("event_name", "occurred_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_website_events_session_occurred_at" ON "website_events" ("session_id", "occurred_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_website_events_product_occurred_at" ON "website_events" ("product_id", "occurred_at" DESC) WHERE "product_id" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_website_events_order_id" ON "website_events" ("order_id") WHERE "order_id" IS NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "website_events"`);
  }
}
