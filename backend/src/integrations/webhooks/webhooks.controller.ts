import { Controller, Headers, Param, Post, Req, UnauthorizedException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { WebhooksService } from "./webhooks.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "@/integrations/payment/payment-provider.interface";
import { SHIPPING_PROVIDER, type ShippingProvider } from "@/integrations/shipping/shipping-provider.interface";
import { Inject } from "@nestjs/common";
import { Public } from "@/common/decorators/public.decorator";
import { randomUUID } from "crypto";

// Sprint 5.7 — Webhook receiver. Reads the raw request body (populated
// by `rawBody: true` in main.ts's NestFactory.create options) since
// signature verification must run over the EXACT bytes the provider
// sent — a re-serialized (parsed-then-stringified) JSON body can differ
// byte-for-byte from the original even with identical field values,
// which would make every signature check fail.
@ApiTags("webhooks")
@Controller({ path: "webhooks", version: "1" })
export class WebhooksController {
  constructor(
    private readonly webhooks: WebhooksService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    @Inject(SHIPPING_PROVIDER) private readonly shippingProvider: ShippingProvider,
  ) {}

  @Public()
  @Post("payment/:provider")
  async payment(
    @Param("provider") providerName: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("x-webhook-signature") signature: string | undefined,
    @Headers("x-webhook-event-id") eventId: string | undefined,
  ) {
    this.assertProviderMatches(providerName, this.paymentProvider.name);
    const rawBody = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body);
    // Sprint 5.7 — a real provider always sends its own idempotency/event
    // ID header; the mock provider (used for all Sprint 5 testing) may
    // not always supply one in a hand-crafted test payload, so this
    // falls back to a fresh UUID — which means replay protection is only
    // meaningfully exercised when the test/caller supplies a consistent
    // x-webhook-event-id across "redelivery" attempts, documented in
    // the Webhook Specification.
    return this.webhooks.receive(this.paymentProvider, "payment", rawBody, signature, eventId ?? randomUUID());
  }

  @Public()
  @Post("shipping/:provider")
  async shipping(
    @Param("provider") providerName: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("x-webhook-signature") signature: string | undefined,
    @Headers("x-webhook-event-id") eventId: string | undefined,
  ) {
    this.assertProviderMatches(providerName, this.shippingProvider.name);
    const rawBody = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body);
    return this.webhooks.receive(this.shippingProvider, "shipping", rawBody, signature, eventId ?? randomUUID());
  }

  // Sprint 5.7 — the URL's :provider segment must match whichever
  // provider is actually configured/active; otherwise a webhook aimed
  // at a provider that isn't the active one would silently be verified
  // against (and processed as if from) the wrong provider's scheme.
  private assertProviderMatches(urlProviderName: string, activeProviderName: string): void {
    if (urlProviderName !== activeProviderName) {
      throw new UnauthorizedException(
        `Webhook posted to /${urlProviderName}, but the active provider is "${activeProviderName}".`,
      );
    }
  }
}
