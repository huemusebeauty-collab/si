import { MigrationInterface, QueryRunner } from "typeorm";

export class GstInvoiceIdentity20260919050000 implements MigrationInterface {
  name = "GstInvoiceIdentity20260919050000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "business_settings"
      ADD COLUMN "legalEntityName" varchar(255),
      ADD COLUMN "gstRegistered" boolean NOT NULL DEFAULT false,
      ADD COLUMN "gstin" varchar(15),
      ADD COLUMN "registeredAddress" text,
      ADD COLUMN "registeredState" varchar(100),
      ADD COLUMN "registeredStateCode" varchar(2),
      ADD COLUMN "reverseChargeDefault" boolean NOT NULL DEFAULT false`);

    await queryRunner.query(`ALTER TABLE "addresses"
      ADD COLUMN "stateCode" varchar(2)`);

    await queryRunner.query(`ALTER TABLE "orders"
      ADD COLUMN "customerGstin" varchar(15),
      ADD COLUMN "customerLegalName" varchar(200),
      ADD COLUMN "placeOfSupplyState" varchar(100),
      ADD COLUMN "placeOfSupplyStateCode" varchar(2)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders"
      DROP COLUMN "placeOfSupplyStateCode",
      DROP COLUMN "placeOfSupplyState",
      DROP COLUMN "customerLegalName",
      DROP COLUMN "customerGstin"`);
    await queryRunner.query(`ALTER TABLE "addresses" DROP COLUMN "stateCode"`);
    await queryRunner.query(`ALTER TABLE "business_settings"
      DROP COLUMN "reverseChargeDefault",
      DROP COLUMN "registeredStateCode",
      DROP COLUMN "registeredState",
      DROP COLUMN "registeredAddress",
      DROP COLUMN "gstin",
      DROP COLUMN "gstRegistered",
      DROP COLUMN "legalEntityName"`);
  }
}
