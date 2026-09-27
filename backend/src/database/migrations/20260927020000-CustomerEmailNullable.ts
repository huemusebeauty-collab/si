import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomerEmailNullable20260927020000 implements MigrationInterface {
  name = "CustomerEmailNullable20260927020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL');
  }
}
