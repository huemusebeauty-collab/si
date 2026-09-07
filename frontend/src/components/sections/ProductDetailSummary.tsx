"use client";
import { useState } from "react";
import { Button } from "@/components/basic/Button";
import { Icon } from "@/components/basic/Icon";
import { ShadeSelector } from "@/components/composite/ShadeSelector";
import { QuantitySelector } from "@/components/composite/QuantitySelector";
import { StarRating } from "@/components/composite/ReviewCard";
import { Badge } from "@/components/basic/Badge";
import { ProductSwatchImage } from "@/components/composite/ProductSwatchImage";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/utils/formatCurrency";

export function ProductDetailSummary({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const isOutOfStock = product.availability === "out-of-stock";

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-md bg-paper">
        <ProductSwatchImage product={product} className="absolute inset-0" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {product.badges.map((b) => (
            <Badge key={b} tone={b.toLowerCase().replace(/\s+/g, "-") as never}>
              {b}
            </Badge>
          ))}
        </div>

        <div className="flex items-start justify-between">
          <h1 className="font-interface text-[16px] leading-[22px] font-semibold text-ink">{product.name}</h1>
          <button
            type="button"
            aria-pressed={wishlisted}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={() => setWishlisted((w) => !w)}
            className={wishlisted ? "text-primary-rose" : "text-charcoal"}
          >
            <Icon size={24} label="">
              <path d="M12 21s-7-4.4-9.5-8.8C.7 8.6 2.3 5 6 5c2 0 3.4 1 6 3.5C14.6 6 16 5 18 5c3.7 0 5.3 3.6 3.5 7.2C19 16.6 12 21 12 21z" />
            </Icon>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <StarRating rating={product.rating} />
          <span className="text-[13px] leading-[18px] text-stone">
            {product.rating.toFixed(1)} ({product.reviewCount} reviews)
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          {product.salePrice ? (
            <>
              <span className="text-[20px] leading-6 font-semibold text-primary-rose">{formatCurrency(product.salePrice, product.currency)}</span>
              <span className="text-[13px] leading-[18px] text-stone line-through">{formatCurrency(product.price, product.currency)}</span>
            </>
          ) : (
            <span className="text-[20px] leading-6 font-semibold text-ink">{formatCurrency(product.price, product.currency)}</span>
          )}
        </div>

        {product.description && <p className="prose-copy text-base text-charcoal">{product.description}</p>}

        {product.shades && product.shades.length > 0 && <ShadeSelector shades={product.shades} />}

        <div className="flex items-center gap-4">
          <QuantitySelector value={quantity} onChange={setQuantity} />
          <Button variant="primary" fullWidth disabled={isOutOfStock}>
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}
