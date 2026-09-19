import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderIdempotencyScope20260919040000 implements MigrationInterface {
  name = "OrderIdempotencyScope20260919040000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_idempotencyKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_customerId_idempotencyKey" UNIQUE ("customerId", "idempotencyKey")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_customerId_idempotencyKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_idempotencyKey" UNIQUE ("idempotencyKey")`,
    );
  }
}
