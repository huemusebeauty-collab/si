import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ProductCommonNameSearch20260927000000 implements MigrationInterface {
  name = "ProductCommonNameSearch20260927000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("products");
    if (!table?.findColumnByName("common_name")) {
      await queryRunner.addColumn(
        "products",
        new TableColumn({
          name: "common_name",
          type: "varchar",
          length: "255",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("products");
    if (table?.findColumnByName("common_name")) {
      await queryRunner.dropColumn("products", "common_name");
    }
  }
}
