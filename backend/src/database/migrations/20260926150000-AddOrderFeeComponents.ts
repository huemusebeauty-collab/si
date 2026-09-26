import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderFeeComponents20260926150000 implements MigrationInterface {
  name = "AddOrderFeeComponents20260926150000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "logisticsFee" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "platformFee" numeric(10,2) NOT NULL DEFAULT 0`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "platformFee"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "logisticsFee"`);
  }
}
