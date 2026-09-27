import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

// Sprint 6B — Admin Customer Management: search/list + single-customer
// lookup by ID (completing the gap Sprint 6A left service-layer only —
// CustomersService.adminSearch existed with no HTTP endpoint). Separate
// controller from CustomersController since that one is deliberately
// scoped to `customers/me` (the authenticated customer's own record) —
// mixing an admin-facing "look up any customer" route into that
// self-scoped controller would blur an otherwise clean boundary.
@ApiTags("admin-customers")
@ApiBearerAuth()
@Controller({ path: "admin/customers", version: "1" })
export class AdminCustomersController {
  constructor(private readonly customers: CustomersService) {}

  @RequirePermission("customers", "view")
  @Get()
  search(@Query("query") query?: string, @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.customers.adminSearch({ query, page: Number(page), pageSize: Number(pageSize) });
  }

  @RequirePermission("customers", "edit")
  @Post()
  create(@Body() body: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    gstin?: string;
    address?: Record<string, unknown>;
  }) {
    const address = body.address ? {
      line1: String(body.address.line1 ?? "").trim(),
      line2: body.address.line2 ? String(body.address.line2).trim() : undefined,
      city: String(body.address.city ?? "").trim(),
      region: String(body.address.region ?? "").trim(),
      stateCode: body.address.stateCode ? String(body.address.stateCode).trim() : undefined,
      postalCode: String(body.address.postalCode ?? "").trim(),
      country: String(body.address.country ?? "India").trim(),
      isDefault: true,
    } : undefined;
    return this.customers.createAdminCustomer({
      firstName: String(body.firstName ?? "").trim(),
      lastName: String(body.lastName ?? "").trim(),
      email: body.email,
      phone: body.phone,
      gstin: body.gstin,
      address: address as any,
    });
  }

  @RequirePermission("customers", "view")
  @Get(":customerId")
  getOne(@Param("customerId") customerId: string) {
    return this.customers.getProfile(customerId);
  }
}
