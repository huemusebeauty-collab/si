import { MigrationInterface, QueryRunner } from "typeorm";

export class GstMrpFoundation20260907000000 implements MigrationInterface {
  name = "GstMrpFoundation20260907000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD "hsnCode" varchar(32)`);
    await queryRunner.query(`ALTER TABLE "products" ADD "gstRate" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "products" ADD "taxInclusiveMrp" boolean NOT NULL DEFAULT true`);

    await queryRunner.query(`ALTER TABLE "product_variants" ADD "mrp" numeric(10,2)`);
    await queryRunner.query(`UPDATE "product_variants" v SET "mrp" = p."price" FROM "products" p WHERE p."id" = v."productId" AND v."mrp" IS NULL`);

    await queryRunner.query(`ALTER TABLE "order_line_items" ADD "mrp" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "order_line_items" ADD "hsnCode" varchar(32)`);
    await queryRunner.query(`ALTER TABLE "order_line_items" ADD "gstRate" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "order_line_items" ADD "taxInclusiveMrp" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "order_line_items" ADD "discountAmount" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "order_line_items" ADD "taxableAmount" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "order_line_items" ADD "taxAmount" numeric(10,2) NOT NULL DEFAULT 0`);

    await queryRunner.query(`ALTER TABLE "orders" ADD "subtotal" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "discountAmount" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "taxableAmount" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "taxAmount" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`UPDATE "orders" SET "subtotal" = "total" WHERE "subtotal" = 0 AND "total" <> 0`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "taxAmount"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "taxableAmount"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "discountAmount"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "subtotal"`);

    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "taxAmount"`);
    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "taxableAmount"`);
    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "discountAmount"`);
    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "taxInclusiveMrp"`);
    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "gstRate"`);
    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "hsnCode"`);
    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "mrp"`);

    await queryRunner.query(`ALTER TABLE "product_variants" DROP COLUMN "mrp"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "taxInclusiveMrp"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "gstRate"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "hsnCode"`);
  }
}
