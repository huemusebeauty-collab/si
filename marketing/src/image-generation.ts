import { randomUUID } from "node:crypto";

export interface ImageGenerationRequest {
  productName: string;
  productImageUrl?: string;
  prompt: string;
  aspectRatio?: "1:1" | "4:5" | "9:16" | "16:9";
}

export interface ImageGenerationResult {
  generationId: string;
  status: "succeeded" | "failed";
  imageUrl?: string;
  error?: string;
  provider?: string;
}

export async function generateMarketingImage(input: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const generationId = `imggen_${randomUUID()}`;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { generationId, status: "failed", error: "Image generation is not configured. Add OPENAI_API_KEY in Marketing HQ." };
  }

  const prompt = [
    "Create a premium Silku beauty marketing creative.",
    `Product: ${input.productName}.`,
    input.productImageUrl ? `Reference product image: ${input.productImageUrl}. Preserve the product identity, packaging, label, shade and proportions.` : "",
    `Creative direction: ${input.prompt}.`,
    "Do not invent a different product, brand, label or shade.",
    "Clean luxury beauty advertising, photorealistic, commercially usable.",
  ].filter(Boolean).join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
        prompt,
        size: sizeFor(input.aspectRatio ?? "1:1"),
        n: 1,
      }),
    });
    const body = await response.json() as any;
    if (!response.ok) {
      const message = body?.error?.message || "Image generation provider request failed";
      return { generationId, status: "failed", error: message, provider: "openai" };
    }
    const imageUrl = body?.data?.[0]?.url;
    if (typeof imageUrl !== "string" || !imageUrl) {
      return { generationId, status: "failed", error: "Image provider returned no image URL", provider: "openai" };
    }
    return { generationId, status: "succeeded", imageUrl, provider: "openai" };
  } catch (error) {
    return { generationId, status: "failed", error: error instanceof Error ? error.message : "Image generation failed", provider: "openai" };
  }
}

function sizeFor(aspectRatio: ImageGenerationRequest["aspectRatio"]): string {
  if (aspectRatio === "4:5") return "1024x1536";
  if (aspectRatio === "9:16") return "1024x1536";
  if (aspectRatio === "16:9") return "1536x1024";
  return "1024x1024";
}
