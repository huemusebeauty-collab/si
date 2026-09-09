import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebsiteEventEntity } from "./entities/website-event.entity";

export interface ProductConversionMetric {
  productId: string;
  views: number;
  carts: number;
  purchases: number;
  viewToCartRate: number;
  cartToPurchaseRate: number;
  viewToPurchaseRate: number;
  opportunity: "high_view_low_cart" | "high_cart_low_purchase" | "healthy" | "insufficient_data";
}

@Injectable()
export class ProductConversionService {
  constructor(
    @InjectRepository(WebsiteEventEntity)
    private readonly events: Repository<WebsiteEventEntity>,
  ) {}

  async getProductConversion(days = 30): Promise<ProductConversionMetric[]> {
    const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
    const rows = await this.events
      .createQueryBuilder("event")
      .select("event.product_id", "productId")
      .addSelect("COUNT(*) FILTER (WHERE event.event_name = 'product_view')", "views")
      .addSelect("COUNT(*) FILTER (WHERE event.event_name = 'add_to_cart')", "carts")
      .addSelect("COUNT(*) FILTER (WHERE event.event_name = 'purchase')", "purchases")
      .where("event.occurred_at >= NOW() - (:days * INTERVAL '1 day')", { days: safeDays })
      .andWhere("event.product_id IS NOT NULL")
      .groupBy("event.product_id")
      .orderBy("COUNT(*) FILTER (WHERE event.event_name = 'product_view')", "DESC")
      .getRawMany();

    return rows.map((row: any) => {
      const views = Number(row.views ?? 0);
      const carts = Number(row.carts ?? 0);
      const purchases = Number(row.purchases ?? 0);
      const viewToCartRate = views ? carts / views : 0;
      const cartToPurchaseRate = carts ? purchases / carts : 0;
      const viewToPurchaseRate = views ? purchases / views : 0;

      let opportunity: ProductConversionMetric["opportunity"] = "healthy";
      if (views < 5) opportunity = "insufficient_data";
      else if (viewToCartRate < 0.03) opportunity = "high_view_low_cart";
      else if (carts >= 5 && cartToPurchaseRate < 0.10) opportunity = "high_cart_low_purchase";

      return {
        productId: String(row.productId),
        views,
        carts,
        purchases,
        viewToCartRate,
        cartToPurchaseRate,
        viewToPurchaseRate,
        opportunity,
      };
    });
  }
}
