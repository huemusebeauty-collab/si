"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { ProductSwatchImage } from "@/components/composite/ProductSwatchImage";

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(?:\?.*)?$/i.test(url);
}

export function ProductMediaGallery({ product, selectedImageUrl }: { product: Product; selectedImageUrl?: string }) {
  const media = useMemo(() => {
    const urls = product.imageUrls.filter(Boolean);
    if (selectedImageUrl && !urls.includes(selectedImageUrl)) return [selectedImageUrl, ...urls];
    return urls;
  }, [product.imageUrls, selectedImageUrl]);
  const [activeUrl, setActiveUrl] = useState(media[0] ?? "");
  const active = media.includes(activeUrl) ? activeUrl : media[0] ?? "";

  if (!media.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md bg-paper p-8 text-center text-sm text-stone">
        Product media coming soon.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[76px_1fr]">
      <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
        {media.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setActiveUrl(url)}
            aria-label={isVideo(url) ? `View product video ${index + 1}` : `View product photo ${index + 1}`}
            aria-pressed={url === active}
            className={"relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-paper sm:h-[68px] sm:w-[68px] " + (url === active ? "border-ink" : "border-transparent")}
          >
            {isVideo(url) ? (
              <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : (
              <img src={url} alt="" className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>
      <div className="order-1 aspect-square overflow-hidden rounded-md bg-paper sm:order-2">
        {isVideo(active) ? (
          <video key={active} src={active} controls playsInline preload="metadata" className="h-full w-full object-contain" />
        ) : (
          <ProductSwatchImage product={product} imageUrl={active} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
