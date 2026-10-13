import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminRefreshTokenRevocation20261013000000 implements MigrationInterface {
  name = "AdminRefreshTokenRevocation20261013000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_users" ADD COLUMN "refreshTokenHash" varchar`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN "refreshTokenHash"`);
  }
}
