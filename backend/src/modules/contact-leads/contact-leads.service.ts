import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContactLeadEntity } from "./entities/contact-lead.entity";
import { CreateContactLeadDto } from "./dto/create-contact-lead.dto";

@Injectable()
export class ContactLeadsService {
  constructor(
    @InjectRepository(ContactLeadEntity)
    private readonly contactLeads: Repository<ContactLeadEntity>,
  ) {}

  async create(dto: CreateContactLeadDto) {
    const lead = this.contactLeads.create({
      full_name: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
      address: dto.address.trim(),
    });

    const saved = await this.contactLeads.save(lead);

    return {
      id: saved.id,
      submitted: true,
      message: "Your details were submitted successfully.",
      businessAddress: "99, Nimera, Jaipur, Rajasthan 303005, India.",
      legalBusinessName: "Shree Khatu Shyam Health Care",
      gstin: "08FYZPB1721H1Z7",
    };
  }
}
