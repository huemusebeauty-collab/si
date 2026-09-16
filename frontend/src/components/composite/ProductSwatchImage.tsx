import type { Product } from "@/types/product";

export function ProductSwatchImage({ product, className = "" }: { product: Product; className?: string }) {
  return (
    <div
      role="img"
      aria-label={product.imageAlt}
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.imageAlt}
          className="h-full w-full object-cover"
          loading="eager"
        />
      ) : (
        <div className="h-full w-full bg-paper" aria-hidden="true" />
      )}
    </div>
  );
}
