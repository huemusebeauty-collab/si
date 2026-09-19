import { MigrationInterface, QueryRunner } from "typeorm";

export class GstTaxBreakdown20260919060000 implements MigrationInterface {
  name = "GstTaxBreakdown20260919060000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_line_items"
      ADD COLUMN "taxType" varchar(16) NOT NULL DEFAULT 'none',
      ADD COLUMN "cgstRate" decimal(5,2) NOT NULL DEFAULT 0,
      ADD COLUMN "cgstAmount" decimal(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN "sgstRate" decimal(5,2) NOT NULL DEFAULT 0,
      ADD COLUMN "sgstAmount" decimal(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN "igstRate" decimal(5,2) NOT NULL DEFAULT 0,
      ADD COLUMN "igstAmount" decimal(10,2) NOT NULL DEFAULT 0`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_line_items"
      DROP COLUMN "igstAmount",
      DROP COLUMN "igstRate",
      DROP COLUMN "sgstAmount",
      DROP COLUMN "sgstRate",
      DROP COLUMN "cgstAmount",
      DROP COLUMN "cgstRate",
      DROP COLUMN "taxType"`);
  }
}
