import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ContactLeadsController } from "./contact-leads.controller";
import { ContactLeadsService } from "./contact-leads.service";
import { ContactLeadEntity } from "./entities/contact-lead.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ContactLeadEntity])],
  controllers: [ContactLeadsController],
  providers: [ContactLeadsService],
})
export class ContactLeadsModule {}
