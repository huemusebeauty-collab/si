import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuditLogService } from "./audit-log.service";
import { PaginationQueryDto } from "@/common/dto/pagination-query.dto";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

// Sprint 6 §15 — read-only; every admin module in the matrix that has
// ANY access level can view its own audit trail, but the log VIEWER
// itself (this controller) is scoped to whoever has at least "view" on
// "dashboard" — the same rough population that sees the Recent Activity
// feed. A stricter per-module log-visibility scheme is a reasonable
// Sprint 7+ refinement, documented in Known Issues.
@ApiTags("admin-audit")
@ApiBearerAuth()
@Controller({ path: "admin/audit-logs", version: "1" })
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @RequirePermission("dashboard", "view")
  @Get()
  list(@Query() query: PaginationQueryDto & { module?: string; entityId?: string }) {
    return this.auditLog.list(query);
  }
}
