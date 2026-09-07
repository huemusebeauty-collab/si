import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionService } from "./transaction.service";

// Sprint 3.2/3.4 — Core Infrastructure + Database Foundation. Registers
// the app-managed PostgreSQL connection. `synchronize: false` always —
// schema changes only via the migration framework (Sprint 3.4).
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get<string>("database.url"),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>("env") === "development",
        // Sprint 3.2 — Graceful shutdown: TypeORM closes its pool on
        // Nest's onApplicationShutdown hook automatically when this flag
        // is set and app.enableShutdownHooks() is called in main.ts.
      }),
    }),
  ],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class DatabaseModule {}
