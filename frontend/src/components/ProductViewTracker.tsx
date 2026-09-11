"use client";

import { useEffect } from "react";
import { trackWebsiteEvent } from "./WebsiteEventTracker";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    trackWebsiteEvent("product_view", { productId });
  }, [productId]);

  return null;
}
