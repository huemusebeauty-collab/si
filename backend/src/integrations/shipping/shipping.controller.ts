import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ShippingService } from "./shipping.service";
import type { ShippingQuoteInput, CreateShipmentInput } from "./shipping-provider.interface";
import { Public } from "@/common/decorators/public.decorator";

@ApiTags("shipping")
@Controller({ path: "shipping", version: "1" })
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Public()
  @Post("quote")
  quote(@Body() body: ShippingQuoteInput) {
    return this.shipping.getQuote(body);
  }

  @Post("shipments")
  createShipment(@Body() body: CreateShipmentInput) {
    return this.shipping.createShipment(body);
  }

  @Public()
  @Get("track/:trackingNumber")
  track(@Param("trackingNumber") trackingNumber: string) {
    return this.shipping.trackShipment(trackingNumber);
  }

  @Get("shipments/:shipmentReference/label")
  label(@Param("shipmentReference") shipmentReference: string) {
    return this.shipping.generateLabel(shipmentReference);
  }
}
