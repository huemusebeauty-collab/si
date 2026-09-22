import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ShippingChargeFoundation20260922000000 implements MigrationInterface {
  name = "ShippingChargeFoundation20260922000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("orders");
    if (!table) throw new Error("orders table not found.");
    if (!table.findColumnByName("shippingAmount")) {
      await queryRunner.addColumn("orders", new TableColumn({
        name: "shippingAmount",
        type: "decimal",
        precision: 10,
        scale: 2,
        default: "0",
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("orders");
    if (table?.findColumnByName("shippingAmount")) {
      await queryRunner.dropColumn("orders", "shippingAmount");
    }
  }
}
