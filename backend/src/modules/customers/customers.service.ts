import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, EntityManager, Repository } from "typeorm";
import { CustomerEntity } from "./entities/customer.entity";
import { AddressEntity } from "./entities/address.entity";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { AddressDto } from "./dto/address.dto";
import { hashPassword, verifyPassword } from "@/modules/auth/password.util";

// Sprint 3.5 — Core Domain Modules: CustomerService, method signatures
// per Phase 16 §16.3. Business logic kept minimal per Sprint 3.5's
// instruction — real persistence via the repository pattern, but no
// deep validation/business rules beyond what's needed for a coherent
// foundation (e.g. no re-authentication step-up check yet on password
// change — flagged in Known Issues as a Sprint 4+ item).
@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity) private readonly customers: Repository<CustomerEntity>,
    @InjectRepository(AddressEntity) private readonly addresses: Repository<AddressEntity>,
  ) {}

  async findByEmail(email: string): Promise<CustomerEntity | null> {
    return this.customers.findOne({ where: { email } });
  }

  async findById(customerId: string): Promise<CustomerEntity> {
    const customer = await this.customers.findOne({ where: { id: customerId }, relations: ["addresses"] });
    if (!customer) throw new NotFoundException("Customer not found.");
    return customer;
  }

  async create(data: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<CustomerEntity> {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException("An account with this email already exists.");
    const customer = this.customers.create({ ...data, preferences: {} });
    return this.customers.save(customer);
  }

  // Sprint 7.4.7 — Idempotent Seeding: distinct from `create` above
  // (which correctly throws on a duplicate email for real registration
  // — that behavior must NOT change). Upserts by email for
  // SeedCustomersProvider, updating name/preferences on repeat runs
  // rather than throwing.
  async upsertByEmail(data: { email: string; passwordHash: string; firstName: string; lastName: string; preferences?: Record<string, unknown> }): Promise<{ entity: CustomerEntity; wasCreated: boolean }> {
    const existing = await this.findByEmail(data.email);
    const entity = existing ?? this.customers.create({ email: data.email, passwordHash: data.passwordHash, preferences: {} });
    entity.firstName = data.firstName;
    entity.lastName = data.lastName;
    if (data.preferences) entity.preferences = { ...entity.preferences, ...data.preferences };
    const saved = await this.customers.save(entity);
    return { entity: saved, wasCreated: !existing };
  }

  // Sprint 7.4.5 — for SeedCustomersProvider's rollback.
  async deleteById(customerId: string): Promise<void> {
    await this.customers.delete({ id: customerId });
  }

  // getProfile(customerId) -> Customer (Phase 16 §16.3)
  async getProfile(customerId: string): Promise<CustomerEntity> {
    return this.findById(customerId);
  }

  // updateProfile(customerId, fields) -> Customer (Phase 16 §16.3)
  async updateProfile(customerId: string, fields: UpdateProfileDto): Promise<CustomerEntity> {
    const customer = await this.findById(customerId);
    Object.assign(customer, fields);
    return this.customers.save(customer);
  }

  // addAddress(customerId, address) -> Address (Phase 16 §16.3)
  async addAddress(customerId: string, address: AddressDto): Promise<AddressEntity> {
    const customer = await this.findById(customerId);
    const entity = this.addresses.create({ ...address, customer });
    return this.addresses.save(entity);
  }

  // updateAddress(customerId, addressId, fields) -> Address (Phase 16 §16.3)
  async updateAddress(customerId: string, addressId: string, fields: Partial<AddressDto>): Promise<AddressEntity> {
    const address = await this.addresses.findOne({ where: { id: addressId, customer: { id: customerId } } });
    if (!address) throw new NotFoundException("Address not found.");
    Object.assign(address, fields);
    return this.addresses.save(address);
  }

  // removeAddress(customerId, addressId) -> {success} (Phase 16 §16.3)
  async removeAddress(customerId: string, addressId: string): Promise<{ success: true }> {
    const result = await this.addresses.delete({ id: addressId, customer: { id: customerId } });
    if (!result.affected) throw new NotFoundException("Address not found.");
    return { success: true };
  }

  // setDefaultAddress(customerId, addressId) -> {success} (Phase 16 §16.3)
  async setDefaultAddress(customerId: string, addressId: string): Promise<{ success: true }> {
    await this.addresses.update({ customer: { id: customerId } }, { isDefault: false });
    const result = await this.addresses.update({ id: addressId, customer: { id: customerId } }, { isDefault: true });
    if (!result.affected) throw new NotFoundException("Address not found.");
    return { success: true };
  }

  // updatePreferences(customerId, prefs) -> Preferences (Phase 16 §16.3)
  async syncManualBillingCustomer(
    manager: EntityManager,
    data: {
      customerId?: string;
      customerName: string;
      customerEmail?: string;
      customerPhone?: string;
      customerGstin?: string;
      billingAddress?: Partial<AddressDto>;
      shippingAddress?: Partial<AddressDto>;
    },
  ): Promise<string> {
    const customerRepo = manager.getRepository(CustomerEntity);
    const addressRepo = manager.getRepository(AddressEntity);
    const normalizedEmail = data.customerEmail?.trim().toLowerCase() || undefined;

    let customer = data.customerId
      ? await customerRepo.findOne({ where: { id: data.customerId }, relations: ["addresses"] })
      : normalizedEmail
        ? await customerRepo.findOne({ where: { email: normalizedEmail }, relations: ["addresses"] })
        : null;

    const nameParts = data.customerName.trim().split(/\\s+/).filter(Boolean);
    const firstName = nameParts.shift() || "Walk-in";
    const lastName = nameParts.join(" ") || "Customer";

    if (!customer) {
      customer = customerRepo.create({
        email: normalizedEmail,
        passwordHash: await hashPassword(`manual-customer:${randomUUID()}`),
        firstName,
        lastName,
        phone: data.customerPhone?.trim() || undefined,
        gstin: data.customerGstin?.trim().toUpperCase() || undefined,
        preferences: { source: "manual_billing" },
      });
      customer = await customerRepo.save(customer);
    } else {
      customer.firstName = firstName;
      customer.lastName = lastName;
      if (normalizedEmail) customer.email = normalizedEmail;
      if (data.customerPhone?.trim()) customer.phone = data.customerPhone.trim();
      if (data.customerGstin?.trim()) customer.gstin = data.customerGstin.trim().toUpperCase();
      customer = await customerRepo.save(customer);
    }

    const address = data.billingAddress ?? data.shippingAddress;
    if (address?.line1 && address.city && address.region && address.postalCode && address.country) {
      const existingDefault = (customer.addresses ?? []).find((item) => item.isDefault);
      if (existingDefault) {
        existingDefault.line1 = String(address.line1);
        existingDefault.line2 = address.line2 ? String(address.line2) : undefined;
        existingDefault.city = String(address.city);
        existingDefault.region = String(address.region);
        existingDefault.stateCode = address.stateCode ? String(address.stateCode) : undefined;
        existingDefault.postalCode = String(address.postalCode);
        existingDefault.country = String(address.country);
        await addressRepo.save(existingDefault);
      } else {
        await addressRepo.save(addressRepo.create({
          customer,
          line1: String(address.line1),
          line2: address.line2 ? String(address.line2) : undefined,
          city: String(address.city),
          region: String(address.region),
          stateCode: address.stateCode ? String(address.stateCode) : undefined,
          postalCode: String(address.postalCode),
          country: String(address.country),
          isDefault: true,
        }));
      }
    }

    return customer.id;
  }

  async updatePreferences(customerId: string, prefs: Record<string, unknown>): Promise<Record<string, unknown>> {
    const customer = await this.findById(customerId);
    customer.preferences = { ...customer.preferences, ...prefs };
    await this.customers.save(customer);
    return customer.preferences;
  }

  // changePassword(customerId, oldPassword, newPassword) -> {success}
  // (Phase 16 §16.3) — was missing from Sprint 3's implementation
  // entirely; added here in Sprint 4.1 (Customer Domain / Profile
  // Validation). Phase 16 §16.3: "Password changes ... require
  // re-authentication or an equivalent step-up check" — enforced here
  // by requiring and verifying the current password before allowing
  // the change.
  async changePassword(customerId: string, oldPassword: string, newPassword: string): Promise<{ success: true }> {
    const customer = await this.findById(customerId);
    const isCorrect = await verifyPassword(oldPassword, customer.passwordHash);
    if (!isCorrect) {
      throw new UnauthorizedException("Current password is incorrect.");
    }
    customer.passwordHash = await hashPassword(newPassword);
    await this.customers.save(customer);
    return { success: true };
  }

  // Sprint 6 — Admin Customer Management: search/list (Phase 6 §6/§14
  // — name, email; filterable by registration date). Order count is
  // NOT joined here (would require injecting Orders' repository,
  // crossing the module boundary Sprint 4's audits enforce) — the
  // admin Customer Profile screen fetches order history separately via
  // OrdersService.listOrderHistory, same as the storefront does.
  async adminSearch(filters: { query?: string; page: number; pageSize: number }) {
    const qb = this.customers.createQueryBuilder("customer").leftJoinAndSelect("customer.addresses", "address").orderBy("customer.createdAt", "DESC");
    if (filters.query) {
      qb.andWhere("(customer.email ILIKE :q OR customer.firstName ILIKE :q OR customer.lastName ILIKE :q OR customer.phone ILIKE :q)", {
        q: `%${filters.query}%`,
      });
    }
    const [items, totalItems] = await qb
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize)
      .getManyAndCount();
    return { items, totalItems };
  }

  // Sprint 6 — Reports: Customers report (Phase 6 §11 — new vs.
  // returning counts over a period). "Returning" here means the
  // customer's account itself predates the period (a simple proxy);
  // a true repeat-*purchase* rate would need an Orders join, flagged
  // in Known Issues as a Sprint 7+ refinement.
  async getCustomersReport(dateFrom: Date, dateTo: Date): Promise<{ newCustomers: number; totalCustomers: number }> {
    const newCustomers = await this.customers.count({ where: { createdAt: Between(dateFrom, dateTo) } });
    const totalCustomers = await this.customers.count();
    return { newCustomers, totalCustomers };
  }
}
