import { randomUUID } from "node:crypto";
import { MediaApi } from "./media-api";
import { NeonMediaRepository } from "./media-repository";
import { createMediaStorageAdapter } from "./media-storage";

const repository = new NeonMediaRepository();
const storage = createMediaStorageAdapter();
const mediaApi = new MediaApi(repository, storage);

export async function hydrateImageStudioMedia(): Promise<void> {
  await repository.hydrate();
}

export async function saveGeneratedMarketingImage(body: Record<string, unknown>) {
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const productName = typeof body.productName === "string" ? body.productName.trim() : "";
  if (!imageUrl || !productName) return { ok: false as const, error: "imageUrl and productName are required" };

  const response = await fetch(imageUrl);
  if (!response.ok) return { ok: false as const, error: `Generated image download failed (HTTP ${response.status})` };
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/png";
  if (!mimeType.startsWith("image/")) return { ok: false as const, error: "Generated provider response is not an image" };
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.byteLength) return { ok: false as const, error: "Generated image is empty" };

  return mediaApi.upload({
    originalName: `${productName.replace(/[^a-zA-Z0-9._-]/g, "_")}_creative_${randomUUID()}.png`,
    mimeType,
    kind: "generated_image",
    dataBase64: data.toString("base64"),
    metadata: {
      source: "image-studio",
      provider: typeof body.provider === "string" ? body.provider : "unknown",
      generationId: typeof body.generationId === "string" ? body.generationId : undefined,
      productName,
      prompt: typeof body.prompt === "string" ? body.prompt : undefined,
      aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : undefined,
    },
  });
}
