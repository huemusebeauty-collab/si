import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderBillingAddress20260926190000 implements MigrationInterface {
  name = "OrderBillingAddress20260926190000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "billingAddress" jsonb`);
    await queryRunner.query(`UPDATE "orders" SET "billingAddress" = "shippingAddress" WHERE "billingAddress" IS NULL`);
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "billingAddress" SET NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "billingAddress"`);
  }
}
