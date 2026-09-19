import { MigrationInterface, QueryRunner } from "typeorm";

export class InventoryMovementFoundation20260919020000 implements MigrationInterface {
  name = "InventoryMovementFoundation20260919020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "inventory_movements" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "variantId" uuid NOT NULL,
      "delta" integer NOT NULL,
      "quantityBefore" integer NOT NULL,
      "quantityAfter" integer NOT NULL,
      "reason" varchar(40) NOT NULL,
      "referenceType" varchar(80),
      "referenceId" varchar(160),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_inventory_movements" PRIMARY KEY ("id"),
      CONSTRAINT "FK_inventory_movements_variant" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT,
      CONSTRAINT "CK_inventory_movements_delta" CHECK ("delta" <> 0),
      CONSTRAINT "CK_inventory_movements_quantityAfter" CHECK ("quantityAfter" >= 0)
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_movements_variant_createdAt" ON "inventory_movements" ("variantId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_movements_reference" ON "inventory_movements" ("referenceType", "referenceId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_inventory_movements_reference"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_movements_variant_createdAt"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_variant"`);
    await queryRunner.query(`DROP TABLE "inventory_movements"`);
  }
}
