import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class CustomerGstin20260927010000 implements MigrationInterface {
  name = "CustomerGstin20260927010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("customers");
    if (!table?.findColumnByName("gstin")) {
      await queryRunner.addColumn(
        "customers",
        new TableColumn({
          name: "gstin",
          type: "varchar",
          length: "15",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("customers");
    if (table?.findColumnByName("gstin")) {
      await queryRunner.dropColumn("customers", "gstin");
    }
  }
}
