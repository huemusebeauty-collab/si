import { MigrationInterface, QueryRunner } from "typeorm";

export class LogisticsFoundation20260919000000 implements MigrationInterface {
  name = "LogisticsFoundation20260919000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TABLE "shipments" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "orderId" uuid NOT NULL,
      "status" varchar NOT NULL DEFAULT 'draft',
      "carrier" varchar(80),
      "serviceLevel" varchar(80),
      "awbNumber" varchar(120),
      "trackingUrl" text,
      "weightGrams" integer,
      "lengthCm" numeric(8,2),
      "widthCm" numeric(8,2),
      "heightCm" numeric(8,2),
      "shippingAddress" jsonb NOT NULL,
      "labelUrl" text,
      "estimatedDeliveryAt" timestamptz,
      "shippedAt" timestamptz,
      "deliveredAt" timestamptz,
      "failureReason" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_shipments" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_shipments_orderId" UNIQUE ("orderId")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_shipments_awbNumber" ON "shipments" ("awbNumber")`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT`);

    await queryRunner.query(`CREATE TABLE "shipment_events" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "shipmentId" uuid NOT NULL,
      "status" varchar NOT NULL,
      "description" text,
      "location" varchar(160),
      "eventAt" timestamptz NOT NULL,
      "externalEventId" varchar(160),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_shipment_events" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_shipment_events_shipmentId" ON "shipment_events" ("shipmentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_shipment_events_eventAt" ON "shipment_events" ("eventAt")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_shipment_events_externalEventId" ON "shipment_events" ("externalEventId") WHERE "externalEventId" IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE "shipment_events" ADD CONSTRAINT "FK_shipment_events_shipment" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shipment_events" DROP CONSTRAINT "FK_shipment_events_shipment"`);
    await queryRunner.query(`DROP INDEX "IDX_shipment_events_externalEventId"`);
    await queryRunner.query(`DROP INDEX "IDX_shipment_events_eventAt"`);
    await queryRunner.query(`DROP INDEX "IDX_shipment_events_shipmentId"`);
    await queryRunner.query(`DROP TABLE "shipment_events"`);
    await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_order"`);
    await queryRunner.query(`DROP INDEX "IDX_shipments_awbNumber"`);
    await queryRunner.query(`DROP TABLE "shipments"`);
  }
}
