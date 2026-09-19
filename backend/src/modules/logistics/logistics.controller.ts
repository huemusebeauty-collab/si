import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { LogisticsService } from "./logistics.service";
import type { ShipmentStatus } from "./entities/shipment.entity";
import { CreateShipmentDto, UpdateShipmentStatusDto } from "./dto/logistics.dto";

@ApiTags("admin-logistics")
@ApiBearerAuth()
@Controller({ path: "admin/logistics", version: "1" })
export class LogisticsController {
  constructor(private readonly logistics: LogisticsService) {}

  @RequirePermission("logistics", "view")
  @Get("dashboard")
  dashboard() {
    return this.logistics.getDashboard();
  }

  @RequirePermission("logistics", "view")
  @Get("shipments")
  list(@Query("status") status?: ShipmentStatus) {
    return this.logistics.list(status);
  }

  @RequirePermission("logistics", "view")
  @Get("shipments/:shipmentId")
  get(@Param("shipmentId") shipmentId: string) {
    return this.logistics.getShipment(shipmentId);
  }

  @RequirePermission("logistics", "view")
  @Get("orders/:orderId")
  byOrder(@Param("orderId") orderId: string) {
    return this.logistics.getByOrder(orderId);
  }

  @RequirePermission("logistics", "view")
  @Get("shipments/:shipmentId/tracking")
  tracking(@Param("shipmentId") shipmentId: string) {
    return this.logistics.getTracking(shipmentId);
  }

  @RequirePermission("logistics", "edit")
  @Post("shipments")
  create(@Body() body: CreateShipmentDto) {
    return this.logistics.createShipment(body);
  }

  @RequirePermission("logistics", "edit")
  @Patch("shipments/:shipmentId/status")
  updateStatus(@Param("shipmentId") shipmentId: string, @Body() body: UpdateShipmentStatusDto) {
    const { status, ...details } = body;
    return this.logistics.updateStatus(shipmentId, status, details);
  }
}
