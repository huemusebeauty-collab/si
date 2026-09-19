import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderIdempotencyFoundation20260919030000 implements MigrationInterface {
  name = "OrderIdempotencyFoundation20260919030000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "idempotencyKey" varchar(128)`);
    await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_idempotencyKey" UNIQUE ("idempotencyKey")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "idempotencyKey"`);
  }
}
