import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { CustomersService } from "@/modules/customers/customers.service";
import { CartService } from "@/modules/cart/cart.service";
import { OrdersService } from "@/modules/orders/orders.service";
import { ProductsService } from "@/modules/products/products.service";
import { CUSTOMER_SEEDS } from "../data/customers";
import { PRODUCT_SEEDS } from "../data/products";
import type { OrderStatus } from "@/modules/orders/entities/order.entity";

// Sprint 7.4.8 — Demo Operational Data: Orders, walked through the
// REAL cart -> checkout -> status-transition flow (CartService.
// createCart/addItem, OrdersService.createOrder/confirmOrder/
// updateStatus/requestCancellation/requestReturn) rather than a direct
// repository insert bypassing business logic — every seeded order
// genuinely passes through the same stock-commitment, state-machine,
// and validation logic a real customer's order would. This is the one
// seed provider that reuses domain WRITE operations this extensively,
// because "a realistic order" IS the business flow, not just data.
//
// Distribution across the 6 statuses Sprint 7.4.8 names (Pending,
// Processing, Shipped, Delivered, Cancelled, Returned) is fixed per
// customer index for reproducibility (not random) — see STATUS_PLAN.
const STATUS_PLAN: OrderStatus[] = ["pending_payment", "processing", "shipped", "delivered", "delivered", "cancelled", "returned", "delivered"];

@Injectable()
export class OrdersSeedProvider implements SeedProvider {
  readonly name = "orders";
  readonly dependsOn: string[] = ["customers"];

  constructor(
    private readonly customers: CustomersService,
    private readonly cart: CartService,
    private readonly orders: OrdersService,
    private readonly products: ProductsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    if (dryRun) {
      // Sprint 7.4.5 — orders are the one provider where dry-run can't
      // meaningfully "preview" without side effects (creating a cart is
      // itself a write) — reports the planned count instead of
      // simulating the flow.
      for (let i = 0; i < CUSTOMER_SEEDS.length; i++) {
        outcomes.push({ naturalKey: `${CUSTOMER_SEEDS[i].email}#order${i}`, action: "created" });
      }
      return { providerName: this.name, outcomes, durationMs: Date.now() - start };
    }

    for (let i = 0; i < CUSTOMER_SEEDS.length; i++) {
      const customerSeed = CUSTOMER_SEEDS[i];
      const naturalKey = `${customerSeed.email}#order${i}`;
      const customer = await this.customers.findByEmail(customerSeed.email);
      if (!customer) {
        outcomes.push({ naturalKey, action: "rejected-invalid" });
        continue;
      }

      // Sprint 7.4.7 — Idempotent Seeding: a customer who already has
      // an order from a prior seed run is skipped, not duplicated. This
      // means re-running the seed does NOT grow the order count
      // unboundedly — a deliberate idempotency choice over "always add
      // one more demo order."
      const alreadyHasOrder = (await this.orders.listOrderHistory(customer.id)).length > 0;
      if (alreadyHasOrder) {
        outcomes.push({ naturalKey, action: "skipped-unchanged" });
        continue;
      }

      const product = PRODUCT_SEEDS[i % PRODUCT_SEEDS.length];
      const variant = await this.products.getProduct(product.slug).then((p) => p.variants[0]).catch(() => null);
      if (!variant) {
        outcomes.push({ naturalKey, action: "rejected-invalid" });
        continue;
      }

      const newCart = await this.cart.createCart({ customerId: customer.id });
      await this.cart.addItem(newCart.id, variant.id, 1);
      const order = await this.orders.createOrder(customer.id, newCart.id, {
        line1: customerSeed.address.line1,
        city: customerSeed.address.city,
        region: customerSeed.address.region,
        postalCode: customerSeed.address.postalCode,
        country: customerSeed.address.country,
      });

      const targetStatus = STATUS_PLAN[i % STATUS_PLAN.length];
      await this.progressOrderTo(order.id, targetStatus);

      // Sprint 7.4.8 — Dashboard Metrics: backdates the order by a
      // spread of 0-45 days so the Dashboard's "Today's Orders" and the
      // Reports' 30-day windows have realistic variation rather than
      // every seeded order landing on the same seed-run timestamp. This
      // is a direct SQL UPDATE — the ONLY place in this seed engine
      // that bypasses a service method — because no legitimate business
      // operation should ever let a caller set an order's own creation
      // date; this is a seed-only technique, not a capability exposed
      // anywhere else.
      // Sprint 9 security correction: `daysAgo` was previously
      // string-interpolated directly into the SQL text
      // (`INTERVAL '${daysAgo} days'`) rather than passed as a bound
      // parameter — only `order.id` was parameterized. Not exploitable
      // as written (daysAgo is a loop-computed number, never user
      // input), but it's exactly the kind of pattern that becomes a
      // real SQL injection risk if copy-pasted somewhere user input
      // does reach it. Found during Sprint 9's security hardening
      // review and fixed here under its defect-correction allowance —
      // rewritten to bind daysAgo as a real parameter via
      // `make_interval`, so no value in this query is ever
      // string-interpolated again.
      const daysAgo = (i * 7) % 45;
      await this.dataSource.query(
        `UPDATE orders SET "createdAt" = NOW() - make_interval(days => $1) WHERE id = $2`,
        [daysAgo, order.id],
      );

      outcomes.push({ naturalKey, action: "created", entityId: order.id });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  // Sprint 7.4.8 — walks an order from pending_payment to the target
  // status via the REAL state machine (OrdersService.confirmOrder /
  // updateStatus / requestCancellation / requestReturn), never
  // writing `status` directly.
  private async progressOrderTo(orderId: string, target: OrderStatus): Promise<void> {
    if (target === "pending_payment") return;

    await this.orders.confirmOrder(orderId, `seed-payment-ref-${orderId.slice(0, 8)}`);
    if (target === "confirmed") return;

    if (target === "cancelled") {
      await this.orders.requestCancellation(orderId, "Seed demo data — customer changed their mind.");
      return;
    }

    await this.orders.updateStatus(orderId, "processing");
    if (target === "processing") return;

    await this.orders.updateStatus(orderId, "shipped");
    if (target === "shipped") return;

    await this.orders.updateStatus(orderId, "delivered");
    if (target === "returned") {
      // Sprint 7.4.8 correction: `requestReturn(orderId, lineItemIds,
      // reason)` — note the argument order — only checks return-window
      // eligibility and acknowledges the request; it does NOT itself
      // transition the order's status (confirmed by reading its
      // implementation directly, not assumed). The actual "returned"
      // transition is a separate `updateStatus` call, matching how a
      // real return would work: a request is first validated as
      // eligible, then (once the physical item is received back,
      // modeled here as immediate for demo purposes) the status
      // changes. Caught and fixed during this same provider's review —
      // the first version of this method called requestReturn with its
      // arguments in the wrong order AND assumed it alone would
      // complete the transition; neither was correct.
      await this.orders.requestReturn(orderId, [], "Seed demo data — shade didn't match expectations.");
      await this.orders.updateStatus(orderId, "returned");
    }
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    // Sprint 7.4.5 — orders are NOT rolled back by deleting the row:
    // an order's stock-commitment side effects (adjustStock calls made
    // during the real checkout flow above) would need their own
    // compensating restock, which OrdersService.requestCancellation
    // already does correctly — reused here rather than a raw delete
    // that would leave inventory counts wrong.
    for (const outcome of outcomes) {
      if (outcome.entityId) {
        await this.orders.requestCancellation(outcome.entityId, "Seed rollback.").catch(() => undefined);
      }
    }
  }
}
