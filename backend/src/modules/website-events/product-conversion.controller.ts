import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProductConversionService } from "./product-conversion.service";

@ApiTags("website-intelligence")
@Controller({ path: "website/analytics/products", version: "1" })
export class ProductConversionController {
  constructor(private readonly productConversion: ProductConversionService) {}

  @Get("conversion")
  getConversion(@Query("days") days?: string) {
    const parsedDays = days === undefined ? 30 : Number(days);
    return this.productConversion.getProductConversion(Number.isFinite(parsedDays) ? parsedDays : 30);
  }
}
