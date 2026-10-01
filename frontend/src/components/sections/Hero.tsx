"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/basic/Button";

export interface HeroSlide {
  imageUrl: string;
  imageAlt: string;
}

export function Hero({
  headline,
  subhead,
  ctaLabel,
  ctaHref,
  imageUrl,
  imageAlt,
  slides = [],
}: {
  headline: string;
  subhead: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
  slides?: HeroSlide[];
}) {
  const allSlides = [{ imageUrl, imageAlt }, ...slides.filter((slide) => slide.imageUrl !== imageUrl)];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (allSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % allSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [allSlides.length]);

  const activeSlide = allSlides[activeIndex] ?? allSlides[0];

  return (
    <section className="relative flex min-h-[480px] items-center overflow-hidden bg-secondary-blush">
      {allSlides.map((slide, index) => (
        <Image
          key={slide.imageUrl}
          src={slide.imageUrl}
          alt={slide.imageAlt}
          fill
          priority={index === 0}
          sizes="100vw"
          className={`object-contain object-center transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          aria-hidden={index !== activeIndex}
        />
      ))}
      <div className="absolute inset-0 bg-ink/30" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-content px-4 sm:px-6">
        <h1 className="max-w-xl font-display text-[40px] leading-[48px] font-semibold text-white">
          {headline}
        </h1>
        <p className="mt-4 max-w-md text-[18px] leading-7 text-white/90">{subhead}</p>
        <Link href={ctaHref} className="mt-6 inline-block">
          <Button variant="primary">{ctaLabel}</Button>
        </Link>
      </div>
      {allSlides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous hero slide"
            onClick={() => setActiveIndex((current) => (current - 1 + allSlides.length) % allSlides.length)}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-xl text-ink shadow-md transition hover:bg-white"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next hero slide"
            onClick={() => setActiveIndex((current) => (current + 1) % allSlides.length)}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-xl text-ink shadow-md transition hover:bg-white"
          >
            →
          </button>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2" aria-label="Hero slides">
            {allSlides.map((slide, index) => (
              <button
                key={slide.imageUrl}
                type="button"
                aria-label={`Go to hero slide ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 w-2.5 rounded-full border border-white transition ${index === activeIndex ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
