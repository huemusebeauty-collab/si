// Sprint 5.3 — Shipping Integration: provider-agnostic interface, same
// pattern as PaymentProvider (Sprint 5.2).
export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface ShippingQuoteInput {
  destination: ShippingAddress;
  weightGrams: number;
}

export interface ShippingQuote {
  serviceLevel: string; // e.g. "standard", "express"
  carrierName: string;
  cost: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

export interface CreateShipmentInput {
  orderId: string;
  destination: ShippingAddress;
  serviceLevel: string;
  weightGrams: number;
}

export interface CreateShipmentResult {
  shipmentReference: string;
  trackingNumber: string;
  labelUrl?: string; // Label Generation Abstraction — provider-hosted URL, or null if generated separately (see generateLabel)
}

export type TrackingStatus = "label_created" | "in_transit" | "out_for_delivery" | "delivered" | "exception";

export interface TrackingResult {
  trackingNumber: string;
  status: TrackingStatus;
  lastUpdate: string;
  history: { status: TrackingStatus; timestamp: string; location?: string }[];
}

export interface ShippingProvider {
  readonly name: string;
  getQuote(input: ShippingQuoteInput): Promise<ShippingQuote[]>;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  trackShipment(trackingNumber: string): Promise<TrackingResult>;
  generateLabel(shipmentReference: string): Promise<{ labelUrl: string; format: "pdf" | "zpl" }>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
}

export const SHIPPING_PROVIDER = Symbol("SHIPPING_PROVIDER");
