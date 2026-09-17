import { Body, Controller, Post, VERSION_NEUTRAL, Version } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators/public.decorator";
import { CreateContactLeadDto } from "./dto/create-contact-lead.dto";
import { ContactLeadsService } from "./contact-leads.service";

@ApiTags("contact-leads")
@Controller("v1/contact-leads")
export class ContactLeadsController {
  constructor(private readonly contactLeads: ContactLeadsService) {}

  @Public()
  @Version(VERSION_NEUTRAL)
  @Post()
  create(@Body() dto: CreateContactLeadDto) {
    return this.contactLeads.create(dto);
  }
}
