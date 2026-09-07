import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { ReviewsService } from "@/modules/reviews/reviews.service";
import { CustomersService } from "@/modules/customers/customers.service";
import { OrdersService } from "@/modules/orders/orders.service";
import { ProductsService } from "@/modules/products/products.service";
import { CUSTOMER_SEEDS } from "../data/customers";
import { PRODUCT_SEEDS } from "../data/products";

// Sprint 7.4.8 — Demo Operational Data: Reviews. "Verified purchase"
// status is computed for real (not hardcoded) by checking whether the
// reviewing customer has an order containing that exact product — the
// same order each customer received from OrdersSeedProvider, since
// both providers run against the same fixed customer/product pairing
// by index. Ratings span the full 1-5 range and moderation states mix
// pending/approved, per Sprint 7.4.8's explicit list.
const RATING_PLAN = [5, 4, 5, 3, 5, 2, 4, 1, 5, 4, 3, 5];
const REVIEW_TEXTS = [
  "Absolutely love this — exactly as described and the color is gorgeous in person.",
  "Good product overall, wears well but not quite as long-lasting as I hoped.",
  "This exceeded my expectations. Will definitely repurchase.",
  "It's fine, nothing special. Does the job but I probably won't rebuy.",
  "My new go-to. The formula is exactly what I've been looking for.",
  "Disappointed — didn't work well for me, though I know results vary.",
  "Solid everyday product. Good value for the price.",
  "Not for me — the finish wasn't what I expected from the photos.",
  "Beautiful finish and it held up all week. Highly recommend.",
  "Really impressed with the quality. Packaging is lovely too.",
  "Decent, does what it says. Would consider other shades.",
  "Perfect — this is now a staple in my routine.",
];

@Injectable()
export class ReviewsSeedProvider implements SeedProvider {
  readonly name = "reviews";
  readonly dependsOn: string[] = ["orders"];

  constructor(
    private readonly reviews: ReviewsService,
    private readonly customers: CustomersService,
    private readonly orders: OrdersService,
    private readonly products: ProductsService,
  ) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    // Sprint 7.4.8 — each seeded customer reviews 1-2 products (their
    // own ordered product, for a genuinely verified review, plus one
    // other product they didn't order, for an unverified one) — a
    // realistic mix rather than every review being verified.
    let reviewIndex = 0;
    for (let i = 0; i < CUSTOMER_SEEDS.length; i++) {
      const customerSeed = CUSTOMER_SEEDS[i];
      const customer = await this.customers.findByEmail(customerSeed.email);
      if (!customer) continue;

      const orderedProduct = PRODUCT_SEEDS[i % PRODUCT_SEEDS.length];
      const unorderedProduct = PRODUCT_SEEDS[(i + 3) % PRODUCT_SEEDS.length];

      for (const [product, isLikelyOwnPurchase] of [[orderedProduct, true], [unorderedProduct, false]] as const) {
        const variant = await this.products.getProduct(product.slug).then((p) => p.variants[0]).catch(() => null);
        if (!variant) continue;

        const naturalKey = `${customerSeed.email}:${product.slug}`;
        if (dryRun) {
          outcomes.push({ naturalKey, action: "created" });
          reviewIndex += 1;
          continue;
        }

        if (await this.reviews.existsForCustomerAndVariant(customer.id, variant.id)) {
          outcomes.push({ naturalKey, action: "skipped-unchanged" });
          reviewIndex += 1;
          continue;
        }

        // Sprint 7.4.8 — real verification, not a flag the seed data
        // just asserts: checks this customer's actual order history for
        // this exact variant.
        const orderHistory = await this.orders.listOrderHistory(customer.id);
        const isVerified = isLikelyOwnPurchase && orderHistory.some((o) => o.lineItems.some((li) => li.variantId === variant.id));

        const rating = RATING_PLAN[reviewIndex % RATING_PLAN.length];
        const text = REVIEW_TEXTS[reviewIndex % REVIEW_TEXTS.length];
        const review = await this.reviews.submitReview(customer.id, variant.id, rating, text, undefined, isVerified);

        // Sprint 7.4.8 — moderation state mix: roughly 3 in 4 approved,
        // the rest left pending, so the admin Review Moderation queue
        // (Sprint 6B) has something real to demonstrate.
        if (reviewIndex % 4 !== 0) {
          await this.reviews.approveReview(review.id, "system-seed");
        }

        outcomes.push({ naturalKey, action: "created", entityId: review.id });
        reviewIndex += 1;
      }
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    for (const outcome of outcomes) {
      if (outcome.entityId) await this.reviews.deleteReview(outcome.entityId, "system-seed").catch(() => undefined);
    }
  }
}
