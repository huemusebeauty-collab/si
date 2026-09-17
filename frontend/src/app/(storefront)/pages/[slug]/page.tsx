import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";

// Storefront policy pages. Business-specific details are kept here until a CMS is introduced.
const STATIC_PAGES: Record<string, { title: string; body: string }> = {
  about: {
    title: "About Silku",
    body: "Silku is the consumer brand of Shree Khatu Shyam Health Care, based in Jaipur, Rajasthan. We focus on beauty and cosmetic products designed for everyday self-expression and personal style. Silku serves customers in India and internationally, subject to applicable delivery and destination restrictions.",
  },
  contact: {
    title: "Contact Us",
    body: "For product, order, shipping, return, or payment support, contact Silku at silku981@gmail.com or +91-7339899606. Legal business name: Shree Khatu Shyam Health Care. Business address: 99, Nimera, Jaipur, Rajasthan 303005, India. GSTIN: 08FYZPB1721H1Z7.",
  },
  "shipping-returns": {
    title: "Shipping & Returns",
    body: "Silku ships within India and internationally, subject to service availability, destination restrictions, customs requirements, and courier coverage. General delivery is expected within 3–7 business days after dispatch for applicable domestic orders, but actual delivery time may vary by PIN code and destination. Orders are generally dispatched within 1–2 business days. International delivery timelines may vary based on destination, customs clearance, and local carrier conditions. For returns, eligible unopened products may be returned within 7 days of delivery, subject to the conditions below. Opened or used beauty/cosmetic products are not eligible for return for hygiene and product-safety reasons.",
  },
  "refund-cancellation": {
    title: "Refund & Cancellation Policy",
    body: "Orders may be cancelled until the order is dispatched. Once an order has been dispatched, cancellation is generally not available. Eligible returns must meet the applicable return conditions and be requested within 7 days of delivery. Opened or used beauty/cosmetic products are not eligible for return. Approved refunds are normally issued to the original payment method. Where the original payment method cannot receive the refund, an applicable bank-transfer fallback may be used after the required verification. Refund processing time can depend on the payment provider or bank.",
  },
  privacy: {
    title: "Privacy Policy",
    body: "Shree Khatu Shyam Health Care (brand: Silku) respects your privacy. We collect and use information needed to provide and improve our services, process orders and payments, communicate with customers, prevent fraud, provide support, and meet legal or regulatory obligations. Information may include contact details, delivery details, order information, payment-related transaction information, and technical information needed to operate the website. Payment credentials are handled by the applicable payment provider and are not stored by Silku as raw card credentials. We may share necessary information with service providers such as payment processors, logistics partners, hosting providers, and technology providers to fulfil these purposes. We retain information only for as long as reasonably necessary for these purposes or as required by law. For privacy questions or requests, contact silku981@gmail.com.",
  },
  terms: {
    title: "Terms & Conditions",
    body: "By using the Silku website or placing an order, you agree to these Terms & Conditions. Product descriptions, availability, pricing, taxes, promotions, and delivery estimates are subject to change and may vary where required by law or operational conditions. Orders are subject to acceptance and successful payment or other applicable payment authorization. Silku may cancel or refuse an order where there is a pricing or listing error, suspected fraud or misuse, stock unavailability, delivery restrictions, or another legitimate operational or legal reason; any eligible payment refund will be handled according to the applicable refund process. Customers are responsible for providing accurate contact and delivery information. International customers are responsible for complying with destination-country import, customs, tax, and other applicable requirements unless otherwise stated. Nothing in these terms limits rights that cannot lawfully be excluded.",
  },
  "shipping-delivery": {
    title: "Shipping & Delivery Policy",
    body: "Silku offers shipping in India and internationally, subject to destination and courier availability. Orders are generally dispatched within 1–2 business days after successful order processing. General domestic delivery is expected within 3–7 business days after dispatch where service coverage permits; actual delivery depends on the destination PIN code and courier network. International delivery times can vary because of destination, customs processing, local carrier operations, and other factors outside Silku’s direct control. Delivery estimates are not a guarantee. Customers should ensure that the delivery address and contact information are complete and accurate. Customs duties, import taxes, or destination-country charges, where applicable, may be payable by the customer unless stated otherwise at checkout.",
  },
  "product-pricing": {
    title: "Product & Pricing Information",
    body: "Product names, descriptions, shades, images, variants, availability, and prices shown on Silku may change from time to time. Prices are displayed in the applicable currency shown at checkout and may include or exclude taxes or charges as indicated there. For the current Silku Nail Lacquer listing, the displayed price is ₹250 per applicable variant, subject to availability and the price shown at checkout. Product images are provided for representation and shade appearance may vary between screens and real-world conditions.",
  },
  faqs: {
    title: "Frequently Asked Questions",
    body: "For questions about products, orders, shipping, returns, or payments, contact Silku at silku981@gmail.com or +91-7339899606.",
  },
  accessibility: {
    title: "Accessibility Statement",
    body: "Silku is committed to making its website usable and accessible to as many customers as reasonably possible. If you encounter an accessibility barrier, please contact silku981@gmail.com with details so we can review it.",
  },
};

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const page = STATIC_PAGES[params.slug];
  if (!page) return {};
  return { title: page.title, alternates: { canonical: `/pages/${params.slug}` } };
}

export default function StaticPage({ params }: Props) {
  const page = STATIC_PAGES[params.slug];
  if (!page) notFound();

  return (
    <div className="py-12">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">{page.title}</h1>
      <p className="prose-copy mt-4 whitespace-pre-line text-base text-charcoal">{page.body}</p>
    </div>
  );
}
