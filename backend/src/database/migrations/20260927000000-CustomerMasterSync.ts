import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomerMasterSync20260927000000 implements MigrationInterface {
  name = "CustomerMasterSync20260927000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "customers" ALTER COLUMN "passwordHash" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "gstin" varchar(15)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "gstin"');
    await queryRunner.query('ALTER TABLE "customers" ALTER COLUMN "passwordHash" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL');
  }
}
