import { apiFetch } from "./client";

export interface StaticPage {
  slug: string;
  title: string;
  content: string;
}

export async function getStaticPage(slug: string): Promise<StaticPage | null> {
  return apiFetch<StaticPage>(`/cms/pages/${encodeURIComponent(slug)}`);
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
