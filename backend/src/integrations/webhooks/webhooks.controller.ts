import { Controller, Headers, Param, Post, Req, UnauthorizedException, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { WebhooksService } from "./webhooks.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "@/integrations/payment/payment-provider.interface";
import { SHIPPING_PROVIDER, type ShippingProvider } from "@/integrations/shipping/shipping-provider.interface";
import { Public } from "@/common/decorators/public.decorator";
import { randomUUID } from "crypto";

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
    const providerEventId = eventId ?? this.extractEventId(rawBody) ?? randomUUID();
    return this.webhooks.receive(this.paymentProvider, "payment", rawBody, signature, providerEventId);
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

  private extractEventId(rawBody: string): string | undefined {
    try {
      const parsed = JSON.parse(rawBody) as { id?: unknown };
      return typeof parsed.id === "string" && parsed.id.length > 0 ? parsed.id : undefined;
    } catch {
      return undefined;
    }
  }

  private assertProviderMatches(urlProviderName: string, activeProviderName: string): void {
    if (urlProviderName !== activeProviderName) {
      throw new UnauthorizedException(
        `Webhook posted to /${urlProviderName}, but the active provider is "${activeProviderName}".`,
      );
    }
  }
}
