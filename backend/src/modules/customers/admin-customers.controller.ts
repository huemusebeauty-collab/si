import { Controller, Get, Param, Query } from "@nestjs/common";
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

  @RequirePermission("customers", "view")
  @Get(":customerId")
  getOne(@Param("customerId") customerId: string) {
    return this.customers.getProfile(customerId);
  }
}
