import { MigrationInterface, QueryRunner } from "typeorm";

export class SocialProfiles20261001000000 implements MigrationInterface {
  name = "SocialProfiles20261001000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "social_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "platform" character varying NOT NULL,
        "profileUrl" character varying NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "displayOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_social_profiles_platform" UNIQUE ("platform"),
        CONSTRAINT "PK_social_profiles_id" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "social_profiles"');
  }
}
