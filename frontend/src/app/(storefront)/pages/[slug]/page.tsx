import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { ContactAddressGate } from "@/components/patterns/ContactAddressGate";
import { getFaqs } from "@/services/api/cms";

// Storefront policy pages. Business-specific details are kept here until a CMS is introduced.
const STATIC_PAGES: Record<string, { title: string; body: string }> = {
  about: {
    title: "About Silku",
    body: "Silku is the consumer brand of Shree Khatu Shyam Health Care, based in Jaipur, Rajasthan. We focus on beauty and cosmetic products designed for everyday self-expression and personal style. Silku currently serves customers in India, subject to applicable delivery and PIN code restrictions.",
  },
  contact: {
    title: "Contact Us",
    body: "For product, order, shipping, return, or payment support, contact Silku at silku981@gmail.com or +91-7339899606. Legal business name: Shree Khatu Shyam Health Care. Business location: Jaipur, Rajasthan. GSTIN: 08FYZPB1721H1Z7.",
  },
  "shipping-returns": {
    title: "Shipping & Returns",
    body: "Silku currently ships within India only, subject to PIN code and courier coverage. Orders are generally dispatched within 1–2 business days after successful order processing. General domestic delivery is expected within 3–7 business days after dispatch, but actual delivery time may vary by PIN code and courier network. Orders of ₹500 or more qualify for free shipping. For returns, eligible unused and unopened products may be returned within 7 days of delivery, subject to the applicable conditions. Opened or used beauty/cosmetic products are not eligible for return for hygiene and product-safety reasons.",
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
    body: "By using the Silku website or placing an order, you agree to these Terms & Conditions. Product descriptions, availability, pricing, taxes, promotions, and delivery estimates are subject to change and may vary where required by law or operational conditions. Orders are subject to acceptance and successful payment or other applicable payment authorization. Silku may cancel or refuse an order where there is a pricing or listing error, suspected fraud or misuse, stock unavailability, delivery restrictions, or another legitimate operational or legal reason; any eligible payment refund will be handled according to the applicable refund process. Customers are responsible for providing accurate contact and delivery information. Silku currently ships within India only, subject to applicable PIN code and courier coverage. Nothing in these terms limits rights that cannot lawfully be excluded.",
  },
  "shipping-delivery": {
    title: "Shipping & Delivery Policy",
    body: "Silku currently offers shipping within India only, subject to PIN code and courier availability. Orders are generally dispatched within 1–2 business days after successful order processing. General domestic delivery is expected within 3–7 business days after dispatch where service coverage permits; actual delivery depends on the destination PIN code and courier network. Orders of ₹500 or more qualify for free shipping. Delivery estimates are not a guarantee. Customers should ensure that the delivery address and contact information are complete and accurate.",
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
  params: Promise<{ slug: string }>;
}

export function generateMetadata({ params }: Props): Metadata {
  const { slug } = await params;
  const page = STATIC_PAGES[slug];
  if (!page) return {};
  return { title: page.title, alternates: { canonical: `/pages/${params.slug}` } };
}

export default async function StaticPage({ params }: Props) {
  const page = STATIC_PAGES[params.slug];
  if (!page) notFound();

  const faqs = slug === "faqs" ? await getFaqs() : [];

  return (
    <div className="py-12">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">{page.title}</h1>

      {slug === "faqs" && faqs.length > 0 ? (
        <div className="mt-6 space-y-4">
          {faqs.map((faq) => (
            <details key={faq.id} className="rounded-lg border border-fog px-4 py-3">
              <summary className="cursor-pointer font-semibold text-ink">{faq.question}</summary>
              <p className="prose-copy mt-3 whitespace-pre-line text-base text-charcoal">{faq.answer}</p>
            </details>
          ))}
        </div>
      ) : (
        <p className="prose-copy mt-4 whitespace-pre-line text-base text-charcoal">{page.body}</p>
      )}

      {slug === "contact" ? <ContactAddressGate /> : null}
    </div>
  );
}
