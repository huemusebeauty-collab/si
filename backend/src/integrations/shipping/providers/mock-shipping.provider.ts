import { Injectable } from "@nestjs/common";
import { randomUUID, createHmac } from "crypto";
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  ShippingProvider,
  ShippingQuote,
  ShippingQuoteInput,
  TrackingResult,
} from "../shipping-provider.interface";

// Sprint 5.3/5.10 — Mock Shipping Provider: fully functional, deterministic.
@Injectable()
export class MockShippingProvider implements ShippingProvider {
  readonly name = "mock";
  private readonly webhookSecret = "mock-shipping-webhook-secret";
  // Sprint 5 scope: in-memory tracking state keyed by tracking number,
  // so trackShipment returns a believable progression instead of a
  // static value — resets on app restart, which is fine for a mock.
  private readonly shipments = new Map<string, { createdAt: number }>();

  async getQuote(input: ShippingQuoteInput): Promise<ShippingQuote[]> {
    const baseRate = 5 + input.weightGrams / 1000; // $5 base + $1/kg, deterministic
    return [
      { serviceLevel: "standard", carrierName: "Mock Carrier", cost: Math.round(baseRate * 100) / 100, estimatedDaysMin: 4, estimatedDaysMax: 7 },
      { serviceLevel: "express", carrierName: "Mock Carrier", cost: Math.round(baseRate * 2.5 * 100) / 100, estimatedDaysMin: 1, estimatedDaysMax: 2 },
    ];
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const trackingNumber = `MOCK${randomUUID().slice(0, 12).toUpperCase().replace(/-/g, "")}`;
    this.shipments.set(trackingNumber, { createdAt: Date.now() });
    return {
      shipmentReference: `mock_ship_${randomUUID()}`,
      trackingNumber,
      labelUrl: undefined, // Sprint 5 scope: generateLabel is a separate call — see below
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingResult> {
    const shipment = this.shipments.get(trackingNumber);
    const createdAt = shipment?.createdAt ?? Date.now();
    const elapsedHours = (Date.now() - createdAt) / (1000 * 60 * 60);

    // Sprint 5 scope: deterministic progression by elapsed time since
    // creation — a real provider's tracking state is external; this
    // simulates plausible movement for testing/demo purposes only.
    const status = elapsedHours < 1 ? "label_created" : elapsedHours < 48 ? "in_transit" : elapsedHours < 72 ? "out_for_delivery" : "delivered";

    return {
      trackingNumber,
      status,
      lastUpdate: new Date().toISOString(),
      history: [{ status: "label_created", timestamp: new Date(createdAt).toISOString() }],
    };
  }

  async generateLabel(shipmentReference: string): Promise<{ labelUrl: string; format: "pdf" | "zpl" }> {
    return { labelUrl: `https://mock-carrier.local/labels/${shipmentReference}.pdf`, format: "pdf" };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    return signatureHeader === expected;
  }

  signPayload(rawBody: string): string {
    return createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }
}
