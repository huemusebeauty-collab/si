"use client";

import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://silku-backend.onrender.com";
const SESSION_KEY = "silku_tracking_session";
const ANONYMOUS_KEY = "silku_tracking_anonymous";

function getStableId(key: string): string {
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function trackWebsiteEvent(
  eventName: "page_view" | "product_view" | "add_to_cart" | "begin_checkout" | "purchase",
  details: {
    productId?: string;
    orderId?: string;
    metadata?: Record<string, unknown>;
  } = {},
): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const payload = {
    eventName,
    sessionId: getStableId(SESSION_KEY),
    anonymousId: getStableId(ANONYMOUS_KEY),
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || undefined,
    source: url.searchParams.get("utm_source") || undefined,
    medium: url.searchParams.get("utm_medium") || undefined,
    campaign: url.searchParams.get("utm_campaign") || undefined,
    productId: details.productId,
    orderId: details.orderId,
    metadata: details.metadata,
    occurredAt: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);
  const endpoint = `${API_URL}/v1/website/events`;

  if (eventName === "page_view" && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    } catch {
      // Fall through to fetch for browsers that reject the beacon payload.
    }
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "omit",
  }).catch(() => {
    // Tracking must never block or break the storefront.
  });
}

export function WebsiteEventTracker() {
  useEffect(() => {
    trackWebsiteEvent("page_view");
  }, []);

  return null;
}
