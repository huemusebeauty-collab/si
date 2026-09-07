// Sprint 7.4 — General FAQs, per Phase 9 §10 FAQ Strategy ("sourced
// from real customer/support questions where available" — these are
// representative of common pre-launch support questions, written in
// the same direct, plain-language voice Phase 9 §3 specifies for
// product FAQs).
export interface FaqSeed {
  question: string;
  answer: string;
  category?: string;
}

export const FAQ_SEEDS: FaqSeed[] = [
  { question: "How long does shipping take?", answer: "Standard shipping arrives within 3-5 business days. Orders over $50 ship free.", category: "shipping" },
  { question: "What is your return policy?", answer: "We accept returns of unused, unopened products within 30 days of delivery for a full refund.", category: "returns" },
  { question: "Are your products cruelty-free?", answer: "Yes, all Hue Muse Beauty products are cruelty-free and never tested on animals.", category: "product" },
  { question: "Do you ship internationally?", answer: "We currently ship within the United States only. International shipping is planned for a future release.", category: "shipping" },
  { question: "How do I find my shade match?", answer: "Each product page lists available shades with swatches; foundation and concealer include undertone guidance in the product description." , category: "product" },
  { question: "Can I change or cancel my order after placing it?", answer: "Orders can be cancelled before they ship. Contact support@huemusebeauty.local as soon as possible with your order number.", category: "orders" },
  { question: "Is my payment information secure?", answer: "Yes — we never store your full card details on our servers; payments are processed through a secure, PCI-compliant provider.", category: "orders" },
];
