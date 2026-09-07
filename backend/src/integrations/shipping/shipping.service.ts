import { Inject, Injectable } from "@nestjs/common";
import { SHIPPING_PROVIDER, type ShippingProvider, type ShippingQuoteInput, type CreateShipmentInput } from "./shipping-provider.interface";
import { ResilientCallService } from "@/integrations/common/resilient-call.service";

@Injectable()
export class ShippingService {
  constructor(
    @Inject(SHIPPING_PROVIDER) private readonly provider: ShippingProvider,
    private readonly resilientCall: ResilientCallService,
  ) {}

  async getQuote(input: ShippingQuoteInput) {
    return this.resilientCall.execute(
      { provider: this.provider.name, operation: "getQuote", timeoutMs: 8_000, retry: { maxAttempts: 3 } },
      () => this.provider.getQuote(input),
    );
  }

  async createShipment(input: CreateShipmentInput) {
    return this.resilientCall.execute(
      { provider: this.provider.name, operation: "createShipment", timeoutMs: 10_000, retry: { maxAttempts: 2 } },
      () => this.provider.createShipment(input),
    );
  }

  async trackShipment(trackingNumber: string) {
    return this.resilientCall.execute(
      { provider: this.provider.name, operation: "trackShipment", timeoutMs: 8_000, retry: { maxAttempts: 3 } },
      () => this.provider.trackShipment(trackingNumber),
    );
  }

  async generateLabel(shipmentReference: string) {
    return this.resilientCall.execute(
      { provider: this.provider.name, operation: "generateLabel", timeoutMs: 8_000, retry: { maxAttempts: 2 } },
      () => this.provider.generateLabel(shipmentReference),
    );
  }
}
