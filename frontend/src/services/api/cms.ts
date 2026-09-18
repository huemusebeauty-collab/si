import { apiFetch } from "./client";

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
