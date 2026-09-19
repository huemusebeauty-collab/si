import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderIdempotencyFoundation20260919030000 implements MigrationInterface {
  name = "OrderIdempotencyFoundation20260919030000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "idempotencyKey" varchar(128)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_orders_idempotencyKey" ON "orders" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_orders_idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "idempotencyKey"`);
  }
}
