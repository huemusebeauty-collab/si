// Sprint 7.4 — Marketing Content: homepage + promotional banners.
export interface BannerSeed {
  placement: string;
  imageUrl: string;
  imageAltText: string;
  headline: string;
  ctaUrl: string;
  daysActive: number; // window length from seed time — see run-seed.ts
}

export const BANNER_SEEDS: BannerSeed[] = [
  {
    placement: "homepage-hero",
    imageUrl: "/mock/banner-hero-new-arrivals.jpg",
    imageAltText: "Hue Muse Beauty new arrivals lineup on a marble surface",
    headline: "New Arrivals Just Landed",
    ctaUrl: "/collections/new-arrivals",
    daysActive: 30,
  },
  {
    placement: "category-top",
    imageUrl: "/mock/banner-best-sellers.jpg",
    imageAltText: "Hue Muse Beauty best-selling nail lacquers and lipsticks",
    headline: "Shop the Best Sellers",
    ctaUrl: "/collections/best-sellers",
    daysActive: 60,
  },
  {
    placement: "homepage-hero",
    imageUrl: "/mock/banner-holiday-shine.jpg",
    imageAltText: "Holiday Shine collection featuring gold and warm metallic shades",
    headline: "Holiday Shine — Warm Metallics for the Season",
    ctaUrl: "/collections/seasonal-holiday-shine",
    daysActive: 21,
  },
];
