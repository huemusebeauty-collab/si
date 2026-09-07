import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionService } from "./transaction.service";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get<string>("database.url"),
        autoLoadEntities: true,
        // One-time bootstrap switch for the currently empty Neon database.
        // Keep false by default; production schema changes should use migrations.
        synchronize: config.get<string>("DB_SYNCHRONIZE") === "true",
        logging: config.get<string>("env") === "development",
      }),
    }),
  ],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class DatabaseModule {}
