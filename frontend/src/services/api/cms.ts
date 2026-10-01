import { apiFetch } from "./client";

export interface StaticPage {
  slug: string;
  title: string;
  content: string;
}

export async function getStaticPage(slug: string): Promise<StaticPage | null> {
  return apiFetch<StaticPage>(`/cms/pages/${encodeURIComponent(slug)}`);
}

export interface Banner {
  id: string;
  placement: string;
  imageUrl: string;
  imageAltText?: string;
  headline?: string;
  ctaUrl?: string;
  startAt: string;
  endAt: string;
}

export async function getBanners(placement: string): Promise<Banner[]> {
  const banners = await apiFetch<Banner[]>(`/cms/banners?placement=${encodeURIComponent(placement)}`);
  return banners ?? [];
}

export interface SocialProfile { id: string; platform: string; profileUrl: string; enabled: boolean; displayOrder: number }

export async function getSocialProfiles(): Promise<SocialProfile[]> {
  const profiles = await apiFetch<SocialProfile[]>("/cms/social");
  return profiles ?? [];
}

export interface FaqEntry {
  id: string;
  category?: string;
  question: string;
  answer: string;
}

export async function getFaqs(category?: string): Promise<FaqEntry[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const faqs = await apiFetch<FaqEntry[]>(`/cms/faqs${query}`);
  return faqs ?? [];
}
