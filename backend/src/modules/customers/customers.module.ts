import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerEntity } from "./entities/customer.entity";
import { AddressEntity } from "./entities/address.entity";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { AdminCustomersController } from "./admin-customers.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerEntity, AddressEntity])],
  controllers: [CustomersController, AdminCustomersController],
  providers: [CustomersService],
  exports: [CustomersService], // Sprint 3.3 — AuthModule consumes this, never the repository directly
})
export class CustomersModule {}
