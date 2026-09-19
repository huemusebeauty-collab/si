import { MigrationInterface, QueryRunner } from "typeorm";

export class InvoiceFoundation20260919010000 implements MigrationInterface {
  name = "InvoiceFoundation20260919010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TABLE "invoice_sequences" ("financialYear" varchar(9) NOT NULL, "nextNumber" integer NOT NULL DEFAULT 1, CONSTRAINT "PK_invoice_sequences_financialYear" PRIMARY KEY ("financialYear"))`);
    await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "invoiceNumber" varchar(16) NOT NULL, "financialYear" varchar(9) NOT NULL, "issuedAt" TIMESTAMPTZ NOT NULL, "snapshot" jsonb NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_invoices_orderId" UNIQUE ("orderId"), CONSTRAINT "UQ_invoices_invoiceNumber" UNIQUE ("invoiceNumber"), CONSTRAINT "FK_invoices_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_financialYear" ON "invoices" ("financialYear")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_invoices_financialYear"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TABLE "invoice_sequences"`);
  }
}
