const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

interface ApiEnvelope<T> {
  data: T;
}

export async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiEnvelope<T>;
    return body.data;
  } catch {
    return null;
  }
}
