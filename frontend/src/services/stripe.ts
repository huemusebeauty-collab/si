import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
  }
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}
