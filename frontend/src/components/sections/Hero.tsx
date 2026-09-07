import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/basic/Button";

export function Hero({
  headline,
  subhead,
  ctaLabel,
  ctaHref,
  imageUrl,
  imageAlt,
}: {
  headline: string;
  subhead: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
}) {
  return (
    <section className="relative flex min-h-[480px] items-center overflow-hidden bg-secondary-blush">
      <Image src={imageUrl} alt={imageAlt} fill priority className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-ink/30" aria-hidden="true" />
      <div className="relative mx-auto max-w-content px-4 sm:px-6">
        <h1 className="max-w-xl font-display text-[40px] leading-[48px] font-semibold text-white">
          {headline}
        </h1>
        <p className="mt-4 max-w-md text-[18px] leading-7 text-white/90">{subhead}</p>
        <Link href={ctaHref} className="mt-6 inline-block">
          <Button variant="primary">{ctaLabel}</Button>
        </Link>
      </div>
    </section>
  );
}
