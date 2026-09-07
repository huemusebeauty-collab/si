import { Injectable } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";

// Sprint 4.9 — Transactions: a thin wrapper around TypeORM's
// DataSource.transaction so every multi-entity write (e.g. order
// creation: Order + OrderLineItem[] + OrderStatusHistory in one atomic
// unit) goes through the same pattern rather than each service
// reinventing transaction/rollback handling.
@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  async runInTransaction<T>(work: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const result = await work(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      // Sprint 4.9 — Rollback handling: any error inside `work` rolls
      // back every write made on this queryRunner's manager, including
      // partial inserts across multiple entities/tables.
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
