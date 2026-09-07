import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

@ApiTags("admin-dashboard")
@ApiBearerAuth()
@Controller({ path: "admin/dashboard", version: "1" })
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @RequirePermission("dashboard", "view")
  @Get("overview")
  getOverview() {
    return this.dashboard.getOverview();
  }
}
